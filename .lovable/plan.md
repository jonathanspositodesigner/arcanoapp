

# Plano de Otimização de Performance — `/upscalerarcanov3-es`

Baseado na análise completa do relatório PageSpeed Insights e da estrutura atual do código.

---

## Contexto

O relatório identifica 14 problemas, com scores mobile críticos: FCP 4.9s, LCP ERRO, TBT ERRO, Performance < 49. A página ES já tem `V3LazySection` em seções abaixo da dobra e auto-slide desativado no mobile, mas faltam otimizações fundamentais de imagens, fontes e estrutura HTML.

---

## Etapas de Implementação (por prioridade)

### 1. Corrigir LCP no mobile — `fetchpriority="high"` + preload
- Nas imagens do hero slider (`upscalerHeroAntes`, `upscalerHeroDepois`), adicionar `fetchpriority="high"` e **remover** `loading="lazy"` se existir.
- Na imagem de background turbo (`turboBgImage`), adicionar `fetchpriority="high"`.
- Adicionar no `index.html` um `<link rel="preload">` condicional para a imagem principal do hero (o asset WebP do antes/depois).

### 2. Adicionar `width` e `height` em TODAS as `<img>` da página
- Hero slider images: definir dimensões reais.
- Gallery before/after (em `V3GalleryBeforeAfter` e `V3RealResultCard`): adicionar `width` e `height` nas tags `<img>`.
- Turbo background image: adicionar dimensões.
- Avatares de testimonials: adicionar dimensões.
- Total: ~32 tags `<img>` precisam de dimensões explícitas.

### 3. Garantir `loading="lazy"` em TODAS as imagens abaixo da dobra
- As imagens nos componentes `V3GalleryBeforeAfter` e `V3RealResultCard` já têm `loading="lazy"` — confirmar.
- Imagens de avatares nos resultados reais: adicionar `loading="lazy"` e `decoding="async"`.

### 4. Adicionar elemento `<main>` na estrutura HTML
- No componente `UpscalerArcanoV3Es.tsx`, trocar o `<div className="v3-page">` por `<main className="v3-page">` (ou envolver o conteúdo com `<main>`).

### 5. Otimizar fontes — preconnect + display=swap
- As fontes `Plus Jakarta Sans`, `DM Sans` e `Syne` são usadas no CSS da V3 mas **não estão sendo preloaded** no `index.html` (só Bebas Neue e Space Grotesk estão).
- Adicionar no `index.html`:
  - `<link rel="preload">` para Plus Jakarta Sans (peso mais usado: 700, 800).
  - Garantir `display=swap` na URL do Google Fonts.
- Alternativa: adicionar um preload async específico para as fontes da V3 diretamente no componente da página ES.

### 6. Adiar scripts não-críticos para a landing
- O `index.html` carrega **Meta Pixel**, **Microsoft Clarity** e **Anti-Inspect** de forma síncrona/bloqueante.
- Mover Clarity e Anti-Inspect para carregar com `defer` ou via `setTimeout` (adiar ~3s).
- Meta Pixel já tem `t.async=!0`, mas o script inline de init roda de forma síncrona — mover para depois do conteúdo ou envolver em `requestIdleCallback`.

### 7. Build target para ES2020 (reduz ~35 KiB de polyfills)
- No `vite.config.ts`, adicionar `build: { target: 'es2020' }` (atualmente não tem target definido).

### 8. Reduzir imports de lucide-react
- A página ES importa `ShieldCheck` e `Infinity` de `lucide-react`. Confirmar que são named imports (já são). Isso é ok, mas o chunk `lucide-icons` inteiro pode estar sendo carregado — verificar se o tree-shaking funciona corretamente com o `manualChunks` atual.

### 9. Corrigir reflow no slider antes/depois
- No `updateSlider`, o código lê `getBoundingClientRect()` e depois escreve `.style.clipPath` e `.style.left`. Isso pode causar layout thrashing.
- Usar `transform: translateX()` no handle em vez de `left` para evitar reflow.

### 10. Envolver seções Audience e FAQ com `V3LazySection`
- A seção "¿Para quién es?" (Audience) está acima do "Como funciona" mas abaixo do hero — envolver com `V3LazySection`.
- A seção FAQ e Final CTA também não estão em lazy sections — envolver.

---

## Arquivos que serão editados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/UpscalerArcanoV3Es.tsx` | fetchpriority, width/height em imgs, `<main>`, lazy sections extras |
| `src/components/upscaler-v3/V3IsolatedComponents.tsx` | width/height nas imgs dos sliders, transform no handle |
| `index.html` | Adiar Clarity/Anti-Inspect, preload fontes V3, preload hero image |
| `vite.config.ts` | `build.target: 'es2020'` |
| `src/styles/upscaler-v3.css` | Nenhuma mudança visual — apenas ajustes se necessário para transform no handle |

---

## O que NÃO muda

- Nenhuma alteração visual/design.
- Cache-Control (#3 do relatório) depende da configuração do hosting (Lovable/Vercel) — não é alterável via código do projeto.
- Compressão de imagens (#11) requer re-exportar os assets externamente — pode ser feito como etapa separada.

