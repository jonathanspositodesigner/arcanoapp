

# Trocar fotos da galeria "Veja o que o Arcano Cloner e capaz de fazer"

## O que sera feito

Substituir as 6 imagens placeholder do Unsplash na galeria expansiva (Expanding Gallery) pelas 6 fotos enviadas, com a foto do homem segurando a camera como a primeira (aberta por padrao).

## Ordem das fotos

1. Homem com camera (padrao/aberta)
2. Mulher de terno branco
3. Homem com dados
4. Mulher com luvas pretas
5. Mulher com capuz rosa e oculos
6. Homem de terno azul

## Passos

1. Copiar as 6 imagens para `public/images/gallery/` com nomes `gallery-1.webp` ate `gallery-6.webp`
2. Atualizar o array `galleryItems` em `src/pages/PlanosArcanoCloner.tsx` para apontar para os novos arquivos locais

## Detalhes tecnicos

**Arquivo modificado:**
- `src/pages/PlanosArcanoCloner.tsx` - linhas 92-99: trocar URLs do Unsplash pelos caminhos locais

**Arquivos criados:**
- `public/images/gallery/gallery-1.webp` (homem com camera)
- `public/images/gallery/gallery-2.webp` (mulher terno branco)
- `public/images/gallery/gallery-3.webp` (homem com dados)
- `public/images/gallery/gallery-4.webp` (mulher luvas pretas)
- `public/images/gallery/gallery-5.webp` (mulher capuz rosa)
- `public/images/gallery/gallery-6.webp` (homem terno azul)

O componente ExpandingGallery ja abre o primeiro item por padrao, entao a foto da camera ficara aberta automaticamente.
