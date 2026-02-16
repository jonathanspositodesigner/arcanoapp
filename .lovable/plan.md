

# Galeria Interativa Estilo Accordion - "Veja o que o Arcano Cloner e capaz de fazer"

## O que muda

Substituir o grid estatico atual por um componente de galeria interativa no estilo "accordion de imagens", igual ao site de referencia (Figma is Pro / Studio IA).

## Comportamento da galeria

1. **Estado padrao**: Todas as imagens aparecem como faixas verticais estreitas lado a lado, em preto e branco (filtro CSS `grayscale`), com uma imagem central ja expandida e colorida
2. **Hover**: Ao passar o mouse sobre uma faixa, ela se expande um pouco (fica mais larga), dando um preview
3. **Clique**: Ao clicar, a imagem expande para ocupar o espaco central grande, ficando colorida. As outras voltam a ser faixas estreitas em P&B
4. **Navegacao**: Setas esquerda/direita no canto superior para navegar entre as imagens
5. **Mobile**: No mobile, funciona com toque - toque para expandir

## Imagens utilizadas

As 6 imagens do `galleryItems` atual (Ensaio Corporativo, Fashion, Lifestyle, Casual, Artistico, Profissional). Como nao ha imagens reais ainda, usarei placeholders com gradientes estilizados ate que imagens reais sejam fornecidas. Ou posso usar imagens de demonstracao do proprio site se houver no projeto.

**Preciso que voce me envie as imagens que quer usar nessa galeria**, pois atualmente os cards sao apenas placeholders sem foto real.

## Detalhes tecnicos

### Novo componente: `src/components/combo-artes/ExpandingGallery.tsx`

- Array de items com `{ imageUrl, label }`
- Estado `activeIndex` para controlar qual imagem esta expandida
- Layout usando `flex` com `transition-all duration-500` para animar a largura
- Imagens inativas: `w-[60px] md:w-[80px]` + `grayscale` + `brightness-50`
- Imagem ativa: `flex-1` (ocupa todo espaco restante) + sem filtro (colorida)
- Hover em inativas: `w-[100px] md:w-[120px]` (expande um pouco)
- Label "IMAGEM GERADA COM ARCANO CLONER" sobre a imagem ativa
- Botoes de navegacao (setas) no canto superior direito em roxo/fuchsia
- Altura fixa do container: `h-[400px] md:h-[500px] lg:h-[600px]`
- `object-cover` em todas as imagens para preencher o espaco
- `rounded-xl` nos cards com `overflow-hidden`
- Gaps de `gap-2` entre as faixas

### Alteracoes em `src/pages/PlanosArcanoCloner.tsx`

- Importar o novo componente `ExpandingGallery`
- Substituir o bloco `StaggeredAnimation` do grid (linhas 249-260) pelo novo componente
- Manter o titulo e subtitulo existentes
- Atualizar `galleryItems` para incluir URLs de imagens

### CSS necessario

Tudo feito via Tailwind, sem CSS customizado:
- `grayscale` / `grayscale-0` para o efeito P&B
- `transition-all duration-500 ease-in-out` para animacoes suaves
- `cursor-pointer` nas faixas inativas

## Sequencia de implementacao

1. Criar o componente `ExpandingGallery.tsx`
2. Atualizar `galleryItems` com URLs de imagens placeholder (gradientes ou imagens do projeto)
3. Substituir o grid atual pelo novo componente na pagina
