

## Plano: Substituir o BeforeAfterSlider pela estrutura exata do Hero

Vou deletar todo o conteudo do `BeforeAfterSlider.tsx` e reescrever usando a mesma estrutura do `HeroBeforeAfterSlider.tsx` que funciona perfeitamente, mantendo apenas os props extras que o componente secundario precisa (zoom, aspect ratio, download).

### O que muda

**Arquivo:** `src/components/upscaler/BeforeAfterSlider.tsx`

- Deletar todo o componente atual
- Copiar a estrutura exata do `HeroBeforeAfterSlider` (que funciona)
- Manter os props extras: `onZoomClick`, `aspectRatio`, `size`, `onDownloadClick`, `downloadFileName`
- Usar o aspect ratio via classe CSS (como o Hero faz) em vez de `style` inline com `getAspectStyle()`
- Labels e slider identicos ao Hero

### Detalhes tecnicos

A diferenca principal e que o Hero usa aspect ratio via **classe CSS** (`aspect-[9/16] md:aspect-[4/3]`) diretamente no container, enquanto o BeforeAfterSlider usa uma funcao `getAspectStyle()` que aplica via `style` inline. Vou manter o aspect ratio customizavel mas aplicar da mesma forma que o Hero.

O componente resultante sera praticamente uma copia do Hero com os props adicionais de zoom, download e aspect ratio configuravel.

