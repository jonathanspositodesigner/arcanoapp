
# Ocultar Precos e Adicionar Sessao de Resultados

## O que sera feito

1. **Ocultar a sessao de precos** (linhas 378-496) - Comentar todo o bloco que inclui pricing + garantia, mantendo o codigo para reativar depois.

2. **Adicionar nova sessao "Veja alguns resultados de usuarios"** no lugar, com dois carrosseis infinitos no estilo marquee identico ao do Bonus 1:
   - Carrossel 1: movendo para a **direita** (usando `marquee-refs-track`)
   - Carrossel 2: movendo para a **esquerda** (usando `marquee-refs-track-reverse`)
   - Bordas com **fade out** nas laterais (gradientes `from-[#0a0510] to-transparent`)
   - Cards com aspecto 3:4, bordas arredondadas e borda roxa sutil
   - Usara as imagens da galeria existente (`/images/gallery/gallery-1.webp` a `gallery-6.webp`) duplicadas para preencher os carrosseis

## Detalhes Tecnicos

### Arquivo: `src/pages/ArcanoClonerTeste.tsx`

- **Comentar** o bloco do pricing (linhas 378-496) com `{/* PRICING (OCULTO) ... */}`
- **Inserir** no lugar a nova sessao com:
  - Titulo: "Veja alguns resultados de usuarios" com destaque em fuchsia
  - Subtitulo discreto
  - Dois `<div>` com `overflow-hidden`, cada um contendo:
    - Dois divs absolutos para o fade lateral (gradiente esquerda e direita)
    - Uma track com classe `marquee-refs-track` (primeiro) e `marquee-refs-track-reverse` (segundo)
    - Imagens duplicadas (array repetido 2x) para loop infinito continuo
  - Mesma estrutura CSS do Bonus 1: `w-[196px] md:w-[180px] shrink-0 aspect-[3/4] rounded-2xl border border-purple-500/20`
  - As animacoes CSS `marquee-refs` e `marquee-refs-reverse` ja existem no `index.css`
