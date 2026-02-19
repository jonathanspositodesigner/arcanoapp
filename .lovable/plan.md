

# Otimizar FCP da Pagina /planos-upscaler-arcano

## Problema
As imagens dos depoimentos e de outras secoes estao carregando junto com o FCP porque:

1. **Nenhuma secao abaixo do hero usa LazySection** - Todas renderizam imediatamente no primeiro paint
2. **BeforeAfterGalleryPT** usa `Suspense` sem `LazySection`, entao o chunk JS e baixado imediatamente no mount da pagina
3. **LazySocialProofWrapper** tem `rootMargin: 500px`, disparando o carregamento dos avatares dos depoimentos muito cedo
4. **FadeIn com delays no hero** (100ms a 800ms) atrasa a exibicao do conteudo principal

## Solucoes

### 1. Envolver todas as secoes abaixo do hero com LazySection
Importar `LazySection` e envolver cada secao com `rootMargin="100px"`:
- Secao da Dor (linha 456)
- BeforeAfterGalleryPT / Suspense (linha 521)
- Para Quem E (linha 526)
- Como Funciona (linha 555)
- Preco/CTA (linha 592)
- Beneficios (linha 669)
- FAQ (linha 697)

### 2. Reduzir rootMargin do LazySocialProofWrapper
Alterar de `500px` para `100px` no `LazySocialProofWrapper.tsx` (linha 33) para que os avatares dos depoimentos so carreguem quando o usuario estiver proximo.

### 3. Remover delays do FadeIn no hero
Zerar os delays dos `FadeIn` no hero (linhas 383, 404, 411, 431) para que o conteudo principal apareca instantaneamente. Manter apenas no ScrollIndicator.

## Detalhes Tecnicos

### Arquivo: `src/pages/PlanosUpscalerArcano.tsx`
- Adicionar import do `LazySection` de `@/components/combo-artes/LazySection`
- Envolver 7 secoes com `<LazySection rootMargin="100px">`
- Remover `delay` props dos `FadeIn` no hero (social proof badge, subtitulo, slider, feature badges)

### Arquivo: `src/components/upscaler/LazySocialProofWrapper.tsx`
- Alterar `rootMargin` de `'500px'` para `'100px'` (linha 33)

## Impacto
- Imagens dos depoimentos (avatares) e da galeria antes/depois deixam de carregar no FCP
- Todas as secoes abaixo do fold so renderizam quando o usuario se aproximar
- Hero aparece instantaneamente sem delays de animacao
