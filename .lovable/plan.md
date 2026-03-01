

# Corrigir imagens cortadas no visualizador de jobs

## Problema

O componente `ZoomableBeforeAfter` esta cortando as imagens porque:
- Usa `object-fit: cover` que recorta a imagem para preencher o container
- Forca `aspect-ratio: 4/3` independente da proporcao real da imagem
- `minScale: 1` impede dar zoom out para ver a imagem inteira

## Solucao

### Arquivo: `src/components/admin/ZoomableBeforeAfter.tsx`

1. Trocar `object-fit: cover` por `object-fit: contain` nas duas imagens (antes e depois) - isso mostra a imagem inteira sem cortar
2. Remover o `aspect-ratio: 4/3` fixo do container e usar uma altura fixa com `max-height` para o container caber no modal sem forcar proporcao
3. Reduzir `minScale` para `0.5` para permitir dar zoom out e ver a imagem inteira quando necessario
4. Adicionar `background: black` no container para as areas vazias ao redor da imagem (quando contain deixa espacos) ficarem com fundo escuro

### Resultado esperado

- Imagens aparecem inteiras sem corte, centralizadas no container
- Usuario pode dar zoom out (ate 0.5x) e zoom in (ate 8x) com scroll do mouse
- Fundo preto nas areas vazias para visual limpo
- Slider antes/depois continua funcionando normalmente

