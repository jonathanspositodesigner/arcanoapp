

# Plano: Checkout Puro para Cartão sem Coleta de Dados

## Problema
Quando o usuário seleciona "Cartão de Crédito", o sistema ainda mostra formulário pedindo email antes de redirecionar ao Pagar.me. O correto é: selecionou cartão → redireciona direto pro checkout do Pagar.me sem pedir NADA.

## Mudanças

### 1. Edge Function `create-pagarme-checkout/index.ts`
- Tornar `user_email` opcional para `billing_type === 'CREDIT_CARD'`
- Usar email placeholder (`checkout-{uuid}@temp.arcano`) quando email não fornecido para cartão
- O `customer_editable: true` já está ativo para cartão puro, então o Pagar.me coleta o email real

### 2. `LandingPricingSection.tsx`
- Para **usuários logados** (caso com `PaymentMethodModal`): já funciona bem, mantém como está
- Para **usuários não logados** (caso com `PreCheckoutModal`): mudar o fluxo para que ao selecionar cartão, dispare o checkout imediatamente sem pedir email

### 3. `PreCheckoutModal.tsx`
- Quando `paymentMethod === 'CREDIT_CARD'` é selecionado:
  - Se já tem email (usuário logado ou preencheu): auto-submit imediato
  - Se não tem email: enviar sem email (edge function aceita sem email para cartão)
- Remover a exigência de email para cartão de crédito no `validate()`
- No `handleSubmit`, para cartão: chamar `invokeCheckout` com apenas `product_slug` e `billing_type: 'CREDIT_CARD'` (sem email se não tiver)

### Resumo Técnico
```
Fluxo CARTÃO atual:  Click → PreCheckoutModal → preenche email → seleciona cartão → submit → Pagar.me
Fluxo CARTÃO novo:   Click → PreCheckoutModal → seleciona cartão → redirect automático → Pagar.me
```

O Pagar.me com `customer_editable: true` já coleta nome, email, CPF e endereço na página hospedada. Não precisa enviar nada antes.
