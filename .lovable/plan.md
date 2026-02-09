
## Alterar preco da pagina /planos-upscaler-arcano-69 para R$39,90

### O que muda

Arquivo unico: `src/pages/PlanosUpscalerArcano69v2.tsx`

3 alteracoes nas linhas 256-259:

1. **Preco principal**: `const price = 4990` (R$49,90) -> `const price = 3990` (R$39,90)
2. **Preco riscado (original)**: `const originalPrice = 6990` (R$69,90) -> `const originalPrice = 4990` (R$49,90)
3. **Comentario**: Atualizar para refletir o novo valor
4. **Parcelas**: O `installmentPrice` ja e calculado automaticamente (`Math.ceil(price / 3)`), entao vai mudar sozinho de R$16,64 para R$13,30

### Resultado visual

| Elemento | Antes | Depois |
|----------|-------|--------|
| Preco riscado | ~~R$69,90~~ | ~~R$49,90~~ |
| Preco principal | R$49,90 | R$39,90 |
| Parcela (3x) | R$16,64 | R$13,30 |

### Observacao importante

O comentario na linha 247 menciona "checkout de R$69,90" -- vou atualizar tambem. O link do checkout (Greenn) permanece o mesmo (`257117`), pois a mudanca de preco no gateway deve ser feita diretamente no painel da Greenn.
