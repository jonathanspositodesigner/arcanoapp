
# Trocar fotos do carrossel de fundo

## O que sera feito

Substituir as 8 imagens do Unsplash no carrossel de fundo do Hero por suas 8 fotos enviadas.

## Passos

1. Copiar as 8 imagens para `public/images/carousel/` (carousel-1.webp ate carousel-8.webp)
2. Atualizar o array `carouselImages` em `src/components/combo-artes/HeroCarouselBackground.tsx` para apontar para os novos arquivos locais

## Detalhes tecnicos

**Arquivos modificados:**
- `src/components/combo-artes/HeroCarouselBackground.tsx` - trocar URLs do Unsplash pelos caminhos locais

**Arquivos criados:**
- `public/images/carousel/carousel-1.webp` ate `carousel-8.webp` (8 fotos copiadas)

O desfoque (`blur-[2px]`) e brilho reduzido (`brightness-75`) ja aplicados serao mantidos.
