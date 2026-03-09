

# Gerenciar métodos de pagamento no checkout do Mercado Pago

## Sobre o PIX desabilitado
O botão "Criar Pix" estar desabilitado na tela do Mercado Pago é um problema **da sua conta MP**, não do código. Possíveis causas:
- Sua conta MP não tem chave PIX cadastrada
- Sua conta não completou a verificação de identidade
- Conta ainda está em processo de aprovação para receber PIX

**Para verificar**: Acesse mercadopago.com.br → Seu negócio → Configurações → PIX e veja se a chave está ativa.

## Remover boleto e controlar métodos de pagamento
Os métodos de pagamento são controlados **no código**, dentro da Edge Function `create-mp-checkout`. Basta adicionar o campo `payment_methods` na preferência com os tipos que você quer excluir.

### Editar `supabase/functions/create-mp-checkout/index.ts`
Adicionar `payment_methods` ao `preferenceBody` (após `payer`):

```typescript
payment_methods: {
  excluded_payment_types: [
    { id: "ticket" }  // Remove boleto
  ],
  installments: 12
},
```

- `"ticket"` = boleto bancário
- Se quiser remover outros: `"atm"` (lotérica), `"debit_card"` (débito)
- PIX é do tipo `"bank_transfer"` — **não** excluir esse

### Tipos de pagamento disponíveis no MP
| ID | Método |
|---|---|
| `credit_card` | Cartão de crédito |
| `debit_card` | Cartão de débito |
| `bank_transfer` | PIX |
| `ticket` | Boleto |
| `atm` | Lotérica |

