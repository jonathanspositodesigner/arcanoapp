
Objetivo

Deixar `/upscalerarcanov3`, `/upscalerarcanov3-es` e `/upscalerarcanov3-teste` o mais rápidas possível no celular, priorizando clique instantâneo, scroll imediato e carregamento muito mais leve.

Diagnóstico real encontrado

- O gargalo ainda é frontend/mobile, não só checkout.
- Perfil mobile mostrou números ruins para landing: FCP ~5.8s, 171 recursos, 1817 nós, 351 listeners, 4.54s de task time.
- No CPU profile, o `autoSlide` do hero ainda aparece consumindo tempo, e o Clarity também pesa.
- No código, os gargalos concretos são:
  - `requestAnimationFrame` + `clip-path` no hero
  - muitos efeitos infinitos no CSS
  - sliders menores com listeners globais permanentes
  - imagens grandes demais para mobile
  - Google Fonts via `@import` dentro do CSS da landing
  - providers globais e scripts extras carregando mesmo em páginas públicas
  - script anti-inspect no `index.html` rodando com `setInterval`

Plano de implementação

1. Criar um “modo mobile lite” nas 3 páginas
- Desligar o auto-slide do hero no mobile.
- Trocar o reveal por `transform/scaleX` ou largura, evitando `clip-path` em loop.
- No mobile, deixar elementos decorativos em versão estática ou muito mais leve:
  - batch grid sem loop contínuo
  - popup social simplificado ou desativado
  - trust badges sem animação
  - remover `transition: all`, sombras gigantes e efeitos infinitos

2. Cortar o peso acima da dobra
- Trocar hero e comparações para assets mobile dedicados.
- Comprimir/substituir os arquivos mais pesados já identificados:
  - hero depois
  - turbo background
  - avatares e imagens de depoimento
- Usar `picture`/source mobile e `decoding="async"`.
- Reusar o padrão existente de lazy render (`LazySection`) para tudo que é abaixo da dobra, mantendo o `#v3-pricing` sempre montado para o botão “Ver Planos” funcionar na hora.

3. Simplificar os sliders internos
- Refatorar `GalleryBeforeAfter` e `RealResultCard` para um componente compartilhado mais leve.
- Remover listeners globais permanentes; listeners só existem durante o drag.
- No mobile, reduzir complexidade: comparação por toque/arraste simples, sem custo contínuo.

4. Baratear os botões internos no celular
- `scrollToPrice` no mobile vira scroll imediato ou muito curto.
- Se necessário, subir a seção de preços na ordem mobile para reduzir o percurso e a sensação de travamento.

5. Reduzir JS e CSS carregado sem necessidade
- Tirar o `@import` de fontes de `src/styles/upscaler-v3.css` e carregar fontes de forma otimizada, com menos famílias/pesos.
- Lazy load do `MPEmailModal` e do código de checkout só quando clicar em comprar.
- Remover dependência desnecessária de ícones pesados nessas landings, ou trocar por SVG inline/local.

6. Tirar peso global dessas rotas
- Em `src/App.tsx`, separar essas landings públicas da árvore pesada de providers quando possível.
- Evitar que `AuthProvider`, `CreditsProvider`, realtime e consultas de créditos/auth subam junto com essas páginas.
- Em `index.html`, desativar ou adiar nessas 3 rotas:
  - Microsoft Clarity
  - script anti-inspect
- Manter apenas o tracking realmente crítico para conversão.

Arquivos principais

- `src/pages/UpscalerArcanoV3.tsx`
- `src/pages/UpscalerArcanoV3Es.tsx`
- `src/pages/UpscalerArcanoV3Teste.tsx`
- `src/components/upscaler-v3/V3IsolatedComponents.tsx`
- `src/styles/upscaler-v3.css`
- `src/components/combo-artes/LazySection.tsx` ou equivalente reaproveitado
- `src/hooks/useMPCheckout.tsx`
- `src/lib/mpCheckout.ts`
- `src/App.tsx`
- `index.html`

Validação

- Testar mobile nas 3 rotas.
- Confirmar resposta imediata em:
  - “Ver Planos”
  - sticky CTA
  - CTA final
  - botões de compra abrindo modal rápido
- Reperfilar para confirmar queda forte em:
  - FCP
  - task time
  - listeners
  - recursos carregados
  - CPU contínua em idle

Detalhes técnicos

- Evidências concretas do projeto:
  - `autoSlide` com `requestAnimationFrame` ainda ativo
  - `clip-path` sendo atualizado continuamente
  - 9 sliders menores adicionando muitos listeners de janela
  - `lucide-react` e modal de checkout entrando cedo demais
  - `@import` de Google Fonts dentro do CSS da própria landing
  - assets mobile ainda não priorizados nessas páginas
  - `AuthProvider`/`CreditsProvider` montados globalmente
  - Clarity e anti-inspect rodando desde o `index.html`
- O maior ganho virá de quatro cortes principais:
  1. parar animação contínua no mobile
  2. reduzir bytes de imagem/fonte
  3. lazy render abaixo da dobra
  4. impedir que código global pesado suba junto com landing pública
