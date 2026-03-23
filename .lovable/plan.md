

# Plano: Reescrever MobileBeforeAfterGallery usando a mesma lógica do HeroBeforeAfterSlider

## Problema

O `MobileBeforeAfterGallery` usa uma lógica de touch diferente do `HeroBeforeAfterSlider` da hero:
- Usa `touch-pan-y` no CSS + checagem de proximidade ao slider (40px) — isso causa travamento
- O slider e a navegação entre imagens conflitam com o scroll da página

O `HeroBeforeAfterSlider` da hero funciona perfeitamente porque usa `touchStartRef` para detectar a **direção do gesto** (horizontal = slider, vertical = scroll) e só chama `preventDefault` quando é arraste horizontal.

## Correção

Reescrever `MobileBeforeAfterGallery.tsx` aplicando a mesma lógica de touch do Hero:

1. **Slider antes/depois**: Copiar exatamente a lógica de `handleTouchStart` / `handleTouchMove` / `handleTouchEnd` do `HeroBeforeAfterSlider` — com `touchStartRef`, `isHorizontalDrag`, e `preventDefault` condicional
2. **Navegação entre imagens**: Usar as setas e dots (manter como está), remover `touch-pan-y` do CSS
3. **Imagens**: Usar `ResilientImage` (mesmo componente do Hero) em vez de `<img>` direto, para evitar travamento de carregamento
4. **Remover**: A checagem de proximidade ao slider (`Math.abs(touchX - sliderX) < 40`) que causa o travamento

## Arquivo

| Arquivo | Alteração |
|---|---|
| `src/components/upscaler/MobileBeforeAfterGallery.tsx` | Reescrever touch handling usando lógica do Hero + usar ResilientImage |

