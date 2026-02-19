
# Corrigir Carregamento Prematuro das Imagens da Gallery

## Problema
As imagens `gallery-1.webp` a `gallery-6.webp` estao sendo carregadas junto com o FCP, antes do usuario chegar na secao. Dois motivos:

1. **LazySection com rootMargin muito grande**: O `rootMargin` padrao e `500px`, que dispara o carregamento muito cedo
2. **Mobile carousel renderiza TODAS as 6 imagens no DOM** (linha 77-102 do ExpandingGallery): Mesmo com `opacity: 0`, o browser carrega todas porque estao no DOM sem `loading="lazy"` efetivo (estao dentro de divs com `position: absolute`)
3. **Desktop tambem renderiza todas as 6** com `loading="lazy"`, mas como estao todas no mesmo viewport do container, o browser pre-carrega todas

## Solucoes

### 1. Reduzir rootMargin do LazySection da gallery
Na pagina `PlanosArcanoCloner.tsx`, passar `rootMargin="100px"` no `LazySection` que envolve a gallery, para so carregar quando o usuario estiver bem proximo.

### 2. Renderizar apenas a imagem ativa no mobile
No `ExpandingGallery.tsx`, no carousel mobile, em vez de renderizar todas as 6 imagens com opacity toggle, renderizar apenas a imagem ativa (e opcionalmente a anterior/proxima para transicao suave). Isso evita que o browser carregue 6 imagens de uma vez.

### 3. Adicionar `loading="lazy"` e `decoding="async"` em todas as `<img>` do ExpandingGallery
Garantir que tanto no mobile quanto no desktop as imagens tenham esses atributos.

## Arquivos a Modificar

| Arquivo | Mudanca |
|---|---|
| `src/pages/PlanosArcanoCloner.tsx` | Passar `rootMargin="100px"` no LazySection da gallery |
| `src/components/combo-artes/ExpandingGallery.tsx` | Mobile: renderizar so 3 imagens (atual, anterior, proxima). Desktop: adicionar `decoding="async"`. |

## Impacto
- As 6 imagens da gallery (total ~1.365 KiB) deixam de ser carregadas no FCP
- Economia de ~1.3 MB no carregamento inicial da pagina
