

## Corrigir ScrollDrivenGallery: preload, tamanho e labels

### Problemas identificados

1. **Imagens demorando**: O preload via `new Image()` funciona, mas as imagens só começam a carregar quando o componente monta (que é lazy). Além disso, o browser pode não usar o cache do `new Image()` para as tags `<img>` do DOM.
2. **Imagens pequenas**: Limitadas por `max-w-4xl` e `aspect-ratio: 4/3` — não ocupam a tela toda.
3. **Labels "Antes/Depois"**: Usuário quer remover.

### Alterações no `ScrollDrivenGallery.tsx`

**Preload robusto**: Renderizar TODAS as imagens (12 total) no DOM como `<img>` com `opacity-0 absolute` e `loading="eager"`. Isso garante que o browser faz o download de todas imediatamente, sem depender do cache do `new Image()`.

**Tamanho fullscreen**: Remover `max-w-4xl`, `aspect-ratio`, `rounded-3xl`, `border`. Usar `w-full h-full` ocupando todo o sticky container (100vh × 100vw). Imagens com `object-cover`.

**Remover labels**: Eliminar os badges "Antes", "Depois" e o label inferior. Manter apenas o slider line + handle, progress dots e scroll hint.

