
## Objetivo
Fazer o resultado do Pose Changer aparecer **com a foto inteira visível, centralizada no meio, sem cortar** (sem “subir” e esconder o rosto), mantendo zoom/pan funcionando direito.

## Diagnóstico (por que está cortando / ficando “pra cima”)
Hoje o viewer está assim:
- `TransformWrapper` com `centerOnInit={true}` e `initialScale={1}`
- `TransformComponent` com `wrapperStyle` e `contentStyle` usando **flex** (centralização via `alignItems/justifyContent`)
- A imagem usa `max-w-full max-h-full object-contain`

Isso pode causar dois problemas comuns no `react-zoom-pan-pinch`:
1) **Cálculo de centralização errado na inicialização**: o `centerOnInit` pode calcular posição antes da imagem ter dimensões definitivas (image load), e a transform inicial fica com `positionY` deslocado (aí o topo “corta”).
2) **Flex no wrapper do TransformComponent** pode atrapalhar o cálculo de bounds/posicionamento interno da lib, gerando offsets estranhos e panning “preso”.

Além disso, tem um bug secundário:
- Os botões de zoom (+/–) no header **só mudam o número** (`zoomLevel`), mas **não aplicam zoom de verdade** no TransformWrapper. Isso bagunça a percepção do usuário (mostra 70% mas a imagem pode estar em outra escala/posição).

## Mudanças propostas (frontend apenas)
### A) Trocar o layout do viewer para um padrão “à prova de corte”
No `src/pages/PoseChangerTool.tsx`, no bloco do resultado:

1) **Remover o `display:flex` do `wrapperStyle`** e padronizar dimensões:
- `TransformComponent.wrapperStyle`: `{ width: '100%', height: '100%' }`
- `TransformComponent.contentStyle`: `{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }`

2) Trocar a imagem para preencher a área e depender do `object-contain` do jeito mais estável:
- `className="w-full h-full object-contain"` (no lugar de `max-w-full max-h-full`)

Isso garante:
- A área transformável (content) sempre tem o mesmo tamanho do wrapper
- A imagem fica contida e centralizada dentro dessa área
- O “fit” não depende de cálculo de max-height/max-width em uma hierarquia que pode variar

### B) Parar de depender do `centerOnInit` (evitar offset “pra cima”)
3) **Remover `centerOnInit={true}`** do TransformWrapper (ou deixar, mas a recomendação aqui é remover para eliminar esse comportamento instável).
4) Garantir que ao mostrar um novo resultado a transform comece “zerada”:
- Adicionar `key={outputImage}` no `TransformWrapper` para forçar remontagem quando trocar a imagem (isso reinicia posição/scale).
- Opcionalmente, usar `onLoad` da imagem para disparar um `resetTransform()` (ver item C abaixo) caso a lib ainda mantenha algum offset.

### C) Consertar os botões de zoom do header (opcional, mas recomendado)
5) Ligar os botões +/– ao TransformWrapper de verdade:
- Criar um `transformRef` (`useRef`) para guardar a instância do zoom-pan-pinch via `onInit`.
- No `onClick` do ZoomIn/ZoomOut, chamar `transformRef.current?.zoomIn(step)` / `zoomOut(step)`.
- Manter o `zoomLevel` sincronizado via `onTransformed`.

Resultado: o % exibido reflete o zoom real, e o usuário tem controle para “ver a foto inteira” facilmente (zoom out de verdade).

## Arquivo a alterar
- `src/pages/PoseChangerTool.tsx` (somente o bloco do viewer/TransformWrapper + handlers dos botões de zoom)

## Como vou validar (checklist rápido)
1) Gerar uma pose e confirmar que:
   - A imagem aparece **inteira** (rosto visível) sem precisar arrastar.
   - Fica **centralizada** no meio (vertical e horizontal).
2) Testar zoom:
   - Botões +/– mudam o zoom real.
   - Zoom out mostra ainda mais da imagem, sem “corte”.
3) Testar pan:
   - Ao dar zoom in, arrastar funciona sem prender embaixo/cima.
4) Confirmar que o lock anti-duplicação (processingRef) continua igual e a fila de 3 simultâneos não é afetada.

## Riscos / efeitos colaterais
- Mudança é só no viewer (CSS/integração de zoom). Não mexe em backend, créditos, fila, nem realtime.
- O comportamento “centralizar automático” passa a ser estável (baseado no tamanho do container) e não em cálculos de init que podem ocorrer antes do carregamento da imagem.
