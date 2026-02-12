

## Plano: Usar HeroBeforeAfterSlider direto nos depoimentos

### Problema
O `BeforeAfterSlider` passa por `LazyBeforeAfterSlider` que adiciona wrappers, logica de lazy loading e placeholders que podem estar quebrando o layout. O Hero funciona porque usa o `HeroBeforeAfterSlider` diretamente, sem nenhum wrapper.

### Solucao

**Arquivo:** `src/components/upscaler/sections/SocialProofSectionPT.tsx`

1. Remover o card da Camila Santos (primeiro item do array `userResults`) completamente
2. Remover imports das imagens `upscalerUser4Antes` e `upscalerUser4Depois`
3. Trocar o `LazyBeforeAfterSlider` por `HeroBeforeAfterSlider` direto em todos os cards restantes
4. Remover o import de `LazyBeforeAfterSlider`
5. Adicionar import de `HeroBeforeAfterSlider`

### Detalhes tecnicos

No `TestimonialCard`, trocar:

```tsx
// DE (wrapper com lazy loading que pode quebrar):
<LazyBeforeAfterSlider
  beforeImage={result.before}
  afterImage={result.after}
  aspectRatio={isMobile ? "3/4" : "4/3"}
  locale="pt"
  onZoomClick={() => onZoomClick(result.before, result.after)}
  bare
/>

// PARA (componente que funciona, direto, sem wrapper):
<HeroBeforeAfterSlider
  beforeImage={result.before}
  afterImage={result.after}
  locale="pt"
/>
```

O `HeroBeforeAfterSlider` ja tem aspect ratio fixo (`aspect-[9/16] md:aspect-[4/3]`), slider, labels - tudo funcionando. Sem wrappers, sem lazy loading, sem nada no meio pra quebrar.

O zoom click sera removido temporariamente pois o Hero nao suporta essa prop, mas o slider vai funcionar igual ao do Hero.

