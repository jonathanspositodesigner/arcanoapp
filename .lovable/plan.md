
# Melhorias na Pagina Arcano Cloner - Bonus e Upscaler

## Resumo das Mudanças

Arquivo unico a modificar: `src/pages/PlanosArcanoCloner.tsx`

## 1. Upscaler Antes/Depois com Slider Interativo

Substituir o placeholder estatico (grid de 2 colunas com "Imagem Antes" / "Imagem Depois") pelo componente `HeroBeforeAfterSlider` ja existente no projeto. Usar as mesmas imagens do upscaler (`/images/upscaler-hero-antes.webp` e `/images/upscaler-hero-depois.webp`) com versoes mobile. O slider sera arrastavel igual ao da pagina planos-upscaler-creditos.

## 2. Secao de Bonus Reorganizada

Separar os 3 bonus atuais (que estao num grid 3 colunas) em secoes individuais dedicadas:

### Bonus 1: +300 Referencias Profissionais
- Titulo e subtitulo
- Carrossel horizontal com imagens placeholder em formato de celular/card (estilo do primeiro print - fotos em cards arredondados passando horizontalmente)
- Animacao de scroll automatico infinito com CSS (marquee style)
- Cards com borda roxa sutil e cantos arredondados

### Bonus 2: Curso de Apresentacao (renomear de "Mini Curso" para "Curso")
- Layout lado a lado: cards de aulas na esquerda, imagem placeholder na direita (estilo do segundo print)
- Cada card de aula com: badge "Aula 01", "Aula 02", titulo, topicos em bullet points
- Icone decorativo no card
- Imagem placeholder a direita com borda roxa e cantos arredondados
- No mobile: empilha verticalmente

### Bonus 3: Upscaler Gratuito
- Mantido como esta (slider antes/depois ja corrigido no item 1)

## 3. Cards de bonus com mesma altura

Remover o grid de 3 colunas atual e substituir por secoes separadas full-width para cada bonus.

## Detalhes Tecnicos

- Importar `HeroBeforeAfterSlider` de `@/components/upscaler`
- Importar `useIsMobile` (ja importado)
- Definir constantes para as imagens do upscaler antes/depois
- Carrossel de referencias: usar CSS animation (translateX) com duplicacao dos itens para efeito infinito
- Cards de aulas: usar divs estilizadas com bg-white/5 e border-white/10
