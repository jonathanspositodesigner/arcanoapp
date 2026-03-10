

# Adicionar card de garantia + trocar seção "O que faz" por galeria sanfonada

## Mudanças no arquivo `src/pages/PlanosUpscalerArcano.tsx`

### 1. Card de garantia Mercado Pago ao lado do card de preço

Transformar a seção de preço (linhas 641-745) de `max-w-lg mx-auto` com 1 card para um layout de **2 colunas** (`grid md:grid-cols-2 gap-6 max-w-4xl mx-auto`):

- **Coluna esquerda**: card de preço existente (sem alterações internas)
- **Coluna direita**: novo card de garantia com:
  - Ícone de escudo verde grande
  - Título "Compra 100% Segura"
  - Texto explicando a proteção do Mercado Pago (pagamento processado pelo Mercado Pago, dados criptografados, garantia de 7 dias)
  - Imagem/badge de "Garantia 7 dias" (ícone estilizado com CSS, usando Shield + Clock)
  - Selos: "Dinheiro de volta", "Sem risco", "Reembolso garantido"
  - Visual: fundo escuro com borda verde/emerald, estilo coerente com a página

### 2. Trocar seção "O que o Upscaler faz" (4 quadrados) pela galeria sanfonada

Substituir a seção "BENEFÍCIOS (O QUE FAZ)" (linhas 747-775) — que tem os 4 cards com features — pelo componente `ExpandingGallery` com os mesmos `galleryItems` da página do Arcano Cloner:

- Import lazy do `ExpandingGallery`
- Definir array `galleryItems` com as 6 imagens (`/images/gallery/gallery-1.webp` a `gallery-6.webp`)
- Manter o título da seção mas renderizar `<ExpandingGallery items={galleryItems} />` em vez do grid de cards

