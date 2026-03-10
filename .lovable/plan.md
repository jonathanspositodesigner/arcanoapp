

## Plano: Endereço falso só para PIX, real para cartão

### Lógica

No edge function `create-pagarme-checkout`, a variável `billing_type` já indica o método escolhido. Usamos isso para decidir:

- **PIX**: Enviar `billing_address` pré-preenchido com endereço genérico + `billing_address_editable: false` → formulário de endereço não aparece
- **Cartão de crédito**: **Não** enviar `billing_address` e manter `billing_address_editable: true` → checkout pede o endereço real (necessário para antifraude)
- **Ambos** (quando não especificado): Não enviar billing_address, deixar o checkout pedir

### Alteração: `supabase/functions/create-pagarme-checkout/index.ts`

No objeto `checkout` do payload, condicionar o `billing_address` ao método de pagamento:

```typescript
const checkoutConfig: Record<string, unknown> = {
  expires_in: 259200,
  accepted_payment_methods: acceptedPaymentMethods,
  success_url: `...`,
  customer_editable: false,
  skip_checkout_success_page: true,
  credit_card: { ... },
  pix: { expires_in: 259200 }
}

if (billing_type === 'PIX') {
  // PIX não usa antifraude — endereço genérico para esconder o formulário
  checkoutConfig.billing_address_editable = false
  checkoutConfig.billing_address = {
    line_1: '1, Av Paulista, Bela Vista',
    zip_code: '01310100',
    city: 'São Paulo',
    state: 'SP',
    country: 'BR'
  }
} else {
  // Cartão precisa de endereço real para antifraude
  checkoutConfig.billing_address_editable = true
}
```

### Resultado
- **PIX**: Checkout abre direto no QR code, sem pedir endereço
- **Cartão**: Checkout pede endereço normalmente (seguro para antifraude)

Apenas 1 arquivo alterado, nenhuma mudança no frontend ou banco.

