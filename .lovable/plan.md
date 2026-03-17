

## Diagnóstico

Dois problemas encontrados:

### Problema 1: Auto-submit ao clicar em "Cartão"
Em `PreCheckoutModal.tsx` linha 627, ao clicar no botão "Cartão", o sistema imediatamente dispara `handleCreditCardAutoSubmit()` que cria o checkout e redireciona automaticamente. Isso é o comportamento indesejado que você nunca pediu — o botão deveria apenas selecionar o método, não disparar o checkout.

### Problema 2: Nome fake enviado ao gateway
Em `create-pagarme-checkout/index.ts` linha 389, quando é checkout de cartão puro, o sistema envia `name: '\u3164'` (caractere invisível coreano) como nome do cliente. Isso é um dado fictício que o antifraude do Pagar.me provavelmente está detectando e recusando a transação.

---

## Plano de correção

### 1. Remover auto-submit do botão Cartão (`PreCheckoutModal.tsx`)
- O botão "Cartão" deve apenas selecionar o método de pagamento (`setPaymentMethod('CREDIT_CARD')`) sem chamar `handleCreditCardAutoSubmit()`
- Adicionar um botão separado "Ir para pagamento" que o usuário clica conscientemente para gerar o checkout
- Remover a função `handleCreditCardAutoSubmit` inteira

### 2. Remover nome fictício do payload (`create-pagarme-checkout/index.ts`)
- No bloco `isPureCreditCardCheckout` (linha 383-394), enviar o objeto `customer` completamente vazio ou sem o campo `name`
- Se a API Pagar.me exigir `name` como campo obrigatório, habilitar `customer_editable: true` para que o gateway colete o nome real do cliente
- Zero dados fictícios — exatamente como você pediu

### Arquivos alterados
- `src/components/upscaler/PreCheckoutModal.tsx` — remover auto-submit, adicionar botão explícito
- `supabase/functions/create-pagarme-checkout/index.ts` — remover nome fictício do customer object

