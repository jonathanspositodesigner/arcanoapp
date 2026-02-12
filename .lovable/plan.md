

# Corrigir aspecto 9:16 no hero mobile da pagina /planos-upscaler-creditos

## Problema encontrado

O componente `HeroBeforeAfterSlider` ja tem `aspect-[9/16]` no mobile, MAS a pagina `PlanosUpscalerCreditos.tsx` (linha 412) tem um **override CSS com !important** que forca `aspect-[5/3]`:

```
[&_.space-y-3>div:first-child]:!aspect-[5/3]
```

Isso sobrescreve a proporcao do componente. Alem disso, o `HeroPlaceholder.tsx` (que aparece antes do usuario clicar) tem `aspect-[2/3]` hardcoded.

## Solucao

### 1. `src/pages/PlanosUpscalerCreditos.tsx` (linha 412)

Remover o override de aspect ratio no mobile e manter so no desktop:

```
De: [&_.space-y-3>div:first-child]:!aspect-[5/3]
Para: md:[&_.space-y-3>div:first-child]:!aspect-[5/3]
```

Isso permite que no mobile o componente use seu proprio `aspect-[9/16]`, e no desktop mantenha o `5/3`.

### 2. `src/components/upscaler/HeroPlaceholder.tsx` (linha 12)

Mudar o aspect ratio do placeholder tambem para 9:16 no mobile:

```
De: aspect-[2/3]
Para: aspect-[9/16] md:aspect-[2/3]
```

## Arquivos a editar

1. **`src/pages/PlanosUpscalerCreditos.tsx`** - Remover override de aspect no mobile
2. **`src/components/upscaler/HeroPlaceholder.tsx`** - Ajustar aspect ratio mobile para 9:16

