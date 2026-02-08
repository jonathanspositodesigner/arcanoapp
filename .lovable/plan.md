
## Inversão da Ordem dos Cards no Modal

**Mudança necessária:** Trocar a posição dos dois cards no grid do modal `UpscalerChoiceModal` para que a **Versão App** apareça primeiro (à esquerda) e a **Versão Ilimitada** apareça depois (à direita).

### Arquivo a modificar
`src/components/ferramentas/UpscalerChoiceModal.tsx`

### O que será feito
Dentro do `div` com `className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 pt-2"` (linha 69):

**Ordem atual:**
1. Card Versão Ilimitada (roxo, ícone ∞)
2. Card Versão App (fúcsia, ícone ⚡)

**Nova ordem:**
1. Card Versão App (fúcsia, ícone ⚡) → aparece primeiro/à esquerda
2. Card Versão Ilimitada (roxo, ícone ∞) → aparece depois/à direita

### Resultado visual
O card rosa/fúcsia com "Versão App" ficará à esquerda, destacando a versão mais fácil de usar como primeira opção.
