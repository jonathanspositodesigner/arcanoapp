

## Bug: Checkout bloqueado na página planos-upscaler-arcano

### Causa raiz

No arquivo `src/components/upscaler/PreCheckoutModal.tsx`, linha 250, existe uma verificação de segurança que **bloqueia explicitamente** o slug padrão:

```typescript
if (!productSlug || productSlug === 'upscaller-arcano-vitalicio') {
  alert('Erro: produto não identificado. Feche e tente novamente.');
  return;
}
```

O problema: a página `PlanosUpscalerArcano.tsx` não passa `productSlug` ao `PreCheckoutModal`, então ele usa o valor default `'upscaller-arcano-vitalicio'`. Mas a verificação de segurança trata esse valor como "nenhum slug foi passado" e bloqueia o checkout. O slug `upscaller-arcano-vitalicio` existe no banco e está ativo (R$29,90).

### Correção

**Arquivo: `src/components/upscaler/PreCheckoutModal.tsx`**
- Remover a condição `productSlug === 'upscaller-arcano-vitalicio'` da verificação de bloqueio na linha 250
- Manter apenas o check `!productSlug` para segurança
- A lógica correta: bloquear apenas se `productSlug` for falsy (vazio, null, undefined)

**Arquivo: `src/pages/PlanosUpscalerArcano.tsx`**
- Passar explicitamente `productSlug="upscaller-arcano-vitalicio"` ao `PreCheckoutModal` para clareza e evitar dependência de defaults

