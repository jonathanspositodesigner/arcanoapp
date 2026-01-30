
## Objetivo
Fazer o vídeo aparecer sempre no modal ao clicar no item, em loop e mutado, sem mostrar “Arquivo não encontrado”.

## Diagnóstico (por que acontece)
No `src/pages/BibliotecaPrompts.tsx`, o **Premium Modal** (quando você clica em um item premium estando sem acesso) está renderizando **sempre**:

```tsx
<SecureImage src={premiumModalItem.imageUrl} ... />
```

Só que, quando `imageUrl` é um `.mp4`, o `<img>` sempre falha (vídeo não é imagem) e o `SecureImage` entra no estado de erro e mostra “Arquivo não encontrado” — mesmo com o vídeo existindo e funcionando no grid (onde o preview usa `LazyVideo`/`SecureVideo`).

Ou seja: o vídeo está OK; o componente usado no modal é que está errado para `.mp4`.

## O que será feito (sem thumbnail, como você pediu)
### 1) Corrigir o Premium Modal para renderizar vídeo quando for .mp4
Arquivo: `src/pages/BibliotecaPrompts.tsx`  
Trecho atual (linhas ~877–889): trocar o `SecureImage` fixo por um render condicional:

- Se `isVideoUrl(premiumModalItem.imageUrl)`:
  - Renderizar **`SecureVideo`** (não thumbnail)
  - Props: `autoPlay`, `muted`, `loop`, `playsInline`, `controls={false}` (ou `true` se quisermos permitir controle manual)
  - Manter o mesmo visual de “preview bloqueado”: `opacity-50` e `h-48`

- Senão (imagem):
  - Mantém `SecureImage` como hoje

Exemplo do comportamento final (idéia do código):
- Vídeo: `<SecureVideo src=... autoPlay muted loop playsInline ... />`
- Imagem: `<SecureImage src=... />`

### 2) Garantir consistência no modal de detalhes (quando o usuário tem acesso)
Arquivo: `src/pages/BibliotecaPrompts.tsx`  
No **Prompt Detail Modal** já existe `SecureVideo` para vídeos (linhas ~918+). Vou alinhar para ficar igual ao que você quer:
- adicionar `muted`
- adicionar `playsInline`
- manter `loop`
- manter `autoPlay` (já está)
Isso evita bloqueio de autoplay em alguns celulares e melhora a consistência.

## Critérios de aceite (o que você vai ver)
1) Clicar num item que é vídeo abre o modal e o vídeo aparece (não some, não fica branco, não vira thumbnail).
2) O vídeo fica **mutado** e em **loop**.
3) O texto “Arquivo não encontrado” deixa de aparecer nesse caso (porque não vamos mais tentar carregar `.mp4` como imagem).

## Arquivos que serão alterados
- `src/pages/BibliotecaPrompts.tsx`

## Teste end-to-end (bem direto)
- Em `/biblioteca-prompts`, clique em um card que seja vídeo:
  - Testar como usuário sem acesso (abre Premium Modal): vídeo deve aparecer mutado/loop.
  - Testar como usuário com acesso (abre Detail Modal): vídeo deve aparecer mutado/loop.
- Testar no mobile (principalmente iOS/Chrome Android) para confirmar autoplay com `muted + playsInline`.
