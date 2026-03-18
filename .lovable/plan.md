

## Scroll-Driven Image Comparison na seção "Melhorado com Upscaler Arcano"

Criar um novo componente para desktop que fixa a seção na tela e usa o scroll do mouse para controlar o slider antes/depois de cada imagem, passando pelas 6 imagens em sequência. No mobile, mantém o layout atual (ExpandingGallery com carrossel).

### Como funciona

```text
┌──────────────────────────────────┐
│  Seção sticky (100vh)            │
│  ┌────────────────────────────┐  │
│  │  Imagem fullscreen         │  │
│  │  ┌───────┬───────────────┐ │  │
│  │  │ ANTES │    DEPOIS     │ │  │
│  │  │       │               │ │  │
│  │  │  ◄────┤  slider       │ │  │
│  │  │       │  controlado   │ │  │
│  │  │       │  pelo scroll  │ │  │
│  │  └───────┴───────────────┘ │  │
│  │  Label + Badge             │  │
│  └────────────────────────────┘  │
│  Progress dots (1-6)             │
└──────────────────────────────────┘
   ↕ scroll = move slider
   Quando slider chega a 0%, avança para próxima imagem
```

- Cada imagem ocupa **100vh de scroll** (6 imagens = 6 × 100vh de altura total do container)
- Scroll para baixo: slider vai de 100% → 0% (revela o "depois")
- Ao completar, transição suave para a próxima imagem
- Scroll para cima: reverte

### Alterações

**1. Novo componente: `src/components/upscaler/ScrollDrivenGallery.tsx`**

- Container com `height: 600vh` (6 × 100vh) para criar espaço de scroll
- Seção interna `position: sticky; top: 0; height: 100vh` para fixar na tela
- `useEffect` com `scroll` listener calcula:
  - `scrollProgress` (0-6) baseado na posição do container
  - `currentImageIndex` = `Math.floor(scrollProgress)`
  - `sliderPosition` = `1 - (scrollProgress % 1)` × 100
- Renderiza imagem "antes" com `clipPath: inset(0 ${sliderPosition}% 0 0)` sobre a imagem "depois"
- Linha divisória + handle no ponto do slider
- Labels "Antes" / "Depois" nos cantos
- Badge com label da imagem na base
- Indicador de progresso (dots) mostrando qual imagem está ativa
- Transição crossfade suave entre imagens

**2. Arquivo: `src/pages/PlanosUpscalerArcano.tsx` (linhas 674-704)**

- No desktop (`hidden md:block`): renderizar `ScrollDrivenGallery` com os 6 pares de imagens
- No mobile (`md:hidden`): manter o `ExpandingGallery` atual sem alterações
- Importar o novo componente (lazy load)

### Detalhes técnicos

- Usa `IntersectionObserver` + `scroll` event para performance
- `requestAnimationFrame` para throttle do scroll
- Imagens pré-carregadas via `<link rel="preload">` ou `Image()` quando a seção entra no viewport
- `will-change: clip-path` para GPU acceleration
- Mobile: nenhuma mudança — `ExpandingGallery` continua como está

