

## Fix: Restaurar headline e remover fotos da galeria scroll-driven

### Problema
A seção da galeria scroll-driven (slider antes/depois com rolagem) na página `/planos-upscaler-arcano` está sem a headline "Melhorado com o Upscaler Arcano". Além disso, a 1ª e a 5ª (última) foto devem ser removidas.

### Alterações

**Arquivo: `src/pages/PlanosUpscalerArcano.tsx`**

1. **Adicionar headline acima do ScrollDrivenGallery** (linhas 661-668):
   - Inserir um `<h2>` com o texto "MELHORADO COM O UPSCALER ARCANO" estilizado com gradiente fuchsia/purple, centralizado, acima do componente `<ScrollDrivenGallery>`

2. **Remover 1ª e 5ª foto dos arrays** (linhas 52-67):
   - `galleryItemsDesktop`: remover item com `1a/1d` (1º) e `6a/6d` (5º), ficando apenas itens 2, 3, 4
   - `galleryItemsMobile`: remover item com `1a_cel/1d_cel` (1º) e `6a_cel/6d_cel` (5º), ficando apenas itens 2, 3, 4

3. **Remover imports não utilizados** (linhas 2-3, 10-11, 13-14, 21-22):
   - Remover imports de `1a.webp`, `1d.webp`, `6a.webp`, `6d.webp` e versões `_cel`

### Resultado
- Galeria fica com 3 slides (fotos 2, 3, 4)
- Headline "MELHORADO COM O UPSCALER ARCANO" visível acima da galeria
- Scroll height ajusta automaticamente (3 × 100vh ao invés de 5 × 100vh)

