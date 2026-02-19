

# Otimizar FCP da Pagina /planos-arcanocloner

## Problemas Identificados

### 1. Imagem Hero sem prioridade
A imagem principal (`arcano-cloner-hero.webp`) nao tem `fetchpriority="high"` nem `<link rel="preload">`. O browser trata ela como qualquer outra imagem, atrasando o LCP.

### 2. Carrossel Hero carrega 16 imagens no primeiro render
O `HeroCarouselBackground` renderiza 16 `<img>` tags imediatamente (8 imagens duplicadas). Mesmo com `loading="lazy"`, o browser precisa processar todos esses elementos DOM no primeiro paint.

### 3. Imports pesados carregados na entrada
Componentes que so aparecem muito abaixo na pagina sao importados estaticamente:
- `ClonerDemoAnimation` (526 linhas, animacoes complexas com timers)
- `ClonerTrialSection` (447 linhas, imports de supabase, modais, etc)
- `HeroBeforeAfterSlider` (slider com touch events)
- `ExpandingGallery` (galeria com swipe)

Tudo isso e parseado e executado ANTES do primeiro pixel aparecer.

### 4. 28 icones Lucide importados de uma vez
A linha de import puxa 28 icones do lucide-react. Mesmo com tree-shaking, o parser precisa resolver todos.

### 5. FadeIn com delay atrasa conteudo visivel
Os `FadeIn` no hero adicionam `delay={100}`, `delay={300}`, `delay={600}` — o texto principal fica invisivel por ate 600ms apos o render.

---

## Solucoes

### A. Preload da imagem hero (index.html)
Adicionar `<link rel="preload">` condicional para a imagem hero do cloner. Como e uma SPA, fazer via tag no HTML global com `fetchpriority`.

Na pratica: adicionar `fetchpriority="high"` e `decoding="sync"` na tag `<img>` do hero no componente.

### B. Lazy import dos componentes pesados
Trocar imports estaticos por `React.lazy()` para os 4 componentes que so aparecem abaixo do fold:

```text
ExpandingGallery      -> React.lazy
ClonerDemoAnimation   -> React.lazy
ClonerTrialSection    -> React.lazy
HeroBeforeAfterSlider -> React.lazy (importado via upscaler)
```

Isso reduz o bundle inicial significativamente — esses componentes so serao baixados quando o `LazySection` os tornar visiveis.

### C. Reduzir imagens do carrossel no primeiro render
No `HeroCarouselBackground`, carregar apenas as primeiras 4-5 imagens com `loading="eager"` (as visiveis na viewport) e as restantes com `loading="lazy"`. Tambem adicionar `decoding="async"` e dimensoes explicitas (`width`/`height`) para evitar layout shift.

### D. Remover delay do FadeIn no hero
O conteudo de texto do hero (headline, subtitle, badges) deve aparecer IMEDIATAMENTE. Remover os delays dos `FadeIn` no hero ou trocar por CSS `animation-delay` puro que nao bloqueia o paint (o FadeIn atual usa `useState` que causa re-render).

### E. Separar imports de icones
Mover os icones que so sao usados em secoes abaixo do fold para dentro dos componentes lazy. No arquivo principal, manter apenas os icones usados no hero (`Sparkles`, `Clock`, `MousePointerClick`).

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---|---|
| `src/pages/PlanosArcanoCloner.tsx` | React.lazy para 4 componentes, fetchpriority na img hero, reduzir imports lucide, remover FadeIn delays no hero |
| `src/components/combo-artes/HeroCarouselBackground.tsx` | Dimensoes explicitas nas imgs, decoding="async", eager so nas primeiras |

## Impacto Esperado

- **FCP**: Melhora significativa — o bundle JS inicial fica menor, menos imagens bloqueiam o render
- **LCP**: A imagem hero carrega com prioridade maxima
- **TTI**: Menos JS parseado na entrada = pagina interativa mais rapido

