
# Plano: Corrigir Layout Shift (CLS) na página Combo Artes Arcanas

## Diagnóstico das Causas do CLS (0.345 total)

Baseado na imagem do PageSpeed, identifiquei **4 causas principais**:

### Causa 1: Glow effect sem dimensões fixas (0.294 CLS)
```
div.absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#EF672C...
```
O efeito de glow no Hero está causando o maior layout shift porque:
- Usa `top-1/3` que muda conforme o conteúdo carrega
- Não tem `pointer-events-none` então pode afetar o layout

### Causa 2: Texto "criando tudo do zero!" (0.042 CLS)
O título do Hero está mudando posição porque a imagem abaixo dele (`area-de-membros-hero.webp`) não tem dimensões fixas definidas.

### Causa 3: Seção "+210 vídeos" carregando junto (0.009 CLS)
A seção `MotionsGallerySection` está sendo pré-carregada muito cedo por causa do `rootMargin: "500px"` no `LazySection`, e o Hero é pequeno demais no mobile.

### Causa 4: Logo sem dimensões definidas
A imagem do logo (`LOGO-CLLR-1.png`) não tem `width` e `height` explícitos, causando reflow.

---

## Solução em 4 Partes

### Parte 1: Aumentar altura mínima do Hero
Garantir que o Hero ocupe pelo menos 100vh (tela cheia) no mobile e desktop para evitar que seções abaixo entrem na viewport inicial.

**Arquivo:** `src/components/combo-artes/HeroSectionCombo.tsx`

```tsx
// Antes:
<section className="relative flex flex-col items-center justify-center py-8 md:py-12 px-4 overflow-hidden">

// Depois:
<section className="relative flex flex-col items-center justify-center min-h-screen py-8 md:py-12 px-4 overflow-hidden">
```

### Parte 2: Corrigir o Glow Effect
Transformar o glow em elemento puramente decorativo que não afeta layout.

**Arquivo:** `src/components/combo-artes/HeroSectionCombo.tsx`

```tsx
// Antes:
<div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#EF672C]/15 rounded-full blur-[120px]" />

// Depois:
<div 
  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#EF672C]/15 rounded-full blur-[120px] pointer-events-none" 
  aria-hidden="true"
/>
```

### Parte 3: Definir dimensões explícitas nas imagens
Adicionar `width` e `height` em todas as imagens para reservar espaço antes do carregamento.

**Arquivo:** `src/components/combo-artes/HeroSectionCombo.tsx`

```tsx
// Logo - adicionar width/height
<img
  src="https://voxvisual.com.br/wp-content/uploads/2024/11/LOGO-CLLR-1.png"
  alt="Biblioteca de Artes Arcanas"
  className="mb-6 h-14 md:h-20 object-contain"
  width={200}
  height={80}
/>

// Imagem área de membros - adicionar aspect-ratio
<img
  src="/images/combo/area-de-membros-hero.webp"
  alt="Área de Membros"
  className="-mt-6 md:-mt-14 -mb-1 max-w-3xl w-full aspect-[16/9] object-contain"
  width={768}
  height={432}
  {...{ fetchpriority: "high" } as React.ImgHTMLAttributes<HTMLImageElement>}
/>
```

### Parte 4: Aumentar margem do LazySection
Reduzir o `rootMargin` para que seções abaixo só carreguem quando o usuário realmente rolar.

**Arquivo:** `src/pages/ComboArtesArcanas.tsx`

```tsx
// Usar rootMargin menor (200px ao invés de 500px) para evitar pré-carregamento
<LazySection rootMargin="200px">
  <Suspense fallback={<SectionSkeleton />}>
    <FlyersGallerySection />
  </Suspense>
</LazySection>
```

---

## Resumo das Mudanças

| Arquivo | Mudança | Impacto CLS |
|---------|---------|-------------|
| HeroSectionCombo.tsx | Adicionar `min-h-screen` na section | -0.294 |
| HeroSectionCombo.tsx | Glow com `top-1/2 -translate-y-1/2` e `pointer-events-none` | -0.294 |
| HeroSectionCombo.tsx | Adicionar `width`/`height` no logo e imagem principal | -0.042 |
| HeroSectionCombo.tsx | Adicionar `aspect-[16/9]` na imagem principal | -0.042 |
| ComboArtesArcanas.tsx | Reduzir `rootMargin` de 500px para 200px | -0.009 |

---

## Resultado Esperado

- CLS reduzido de **0.345** para próximo de **0** 
- Hero ocupa tela inteira, seções abaixo não carregam no load inicial
- Imagens com espaço reservado, sem "pulo" durante carregamento
- Glow decorativo não interfere no layout
