

# Corrigir Hero - Layout igual ao print de referencia (Studio IA)

## Problemas atuais
- Tem 2 fileiras de carrossel (deveria ser apenas 1)
- Foto PNG esta separada do carrossel (deveria estar sobreposta)
- Nao tem degradê roxo suave de baixo pra cima (corte duro)
- Os nomes/labels das fotos nao passam por cima da foto PNG

## O que sera feito (baseado no print de referencia)

### 1. Trocar a foto PNG
- Copiar `nanobanana-RECORDADA-2.webp` para `public/images/arcano-cloner-hero.webp` (substituir a atual)

### 2. Refazer `HeroCarouselBackground.tsx`
- **Uma unica fileira** de fotos (nao duas), centralizada verticalmente
- Fotos maiores tipo cards (`w-48 h-64 md:w-56 md:h-72`) com `rounded-2xl`
- Scroll infinito para a esquerda (manter `animate-carousel-scroll`)
- Sem blur nas fotos - elas aparecem nitidas mas com leve escurecimento (`brightness-75`)
- Sem a segunda fileira (remover Row 2)
- Manter overlay de fade mas ajustar: degradê forte de baixo pra cima (`from-[#0f0a15] via-[#0f0a15]/80 to-transparent`) para suavizar a transicao

### 3. Reposicionar foto PNG sobre o carrossel
- A foto PNG fica centralizada **por cima** do carrossel (position absolute, centrada)
- Tamanho maior (`w-64 md:w-80 lg:w-96`)
- z-index acima do carrossel mas abaixo do texto
- Glow roxo atras da foto (manter o blur fuchsia)

### 4. Degradê roxo de baixo pra cima
- Adicionar um gradiente roxo (`from-purple-900/60 to-transparent`) subindo por cima de tudo (carrossel + foto) para eliminar o recorte duro
- Isso cria a transicao suave igual no print

### 5. Layout geral do hero
- O container do carrossel + foto tem altura fixa (`h-[350px] md:h-[450px] lg:h-[500px]`)
- Carrossel ocupa toda a largura, centralizado verticalmente
- Foto PNG sobreposta ao centro, parte inferior dela se funde com o degradê
- Texto (headline, social proof, badges) fica abaixo desse bloco visual

### Arquivos alterados
- `public/images/arcano-cloner-hero.webp` - substituir pela nova foto
- `src/components/combo-artes/HeroCarouselBackground.tsx` - refazer com 1 fileira + degradê correto
- `src/pages/PlanosArcanoCloner.tsx` - ajustar posicionamento da foto PNG sobre o carrossel

