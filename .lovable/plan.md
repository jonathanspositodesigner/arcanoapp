

# Plano: Modal mínimo com campos obrigatórios do Pagar.me antes do checkout

## Contexto

A API do Pagar.me exige `customer` com `name`, `email`, `document` (CPF) e `document_type` para criar a ordem. Sem esses campos, retorna erro 422. Então vamos coletar **apenas esses 3 campos** num modal simples antes de redirecionar.

## Alterações

### 1. Criar `src/components/checkout/CheckoutCustomerModal.tsx`

Modal simples com 3 campos:
- **Nome completo** (text)
- **E-mail** (email)
- **CPF** (text, com máscara `000.000.000-00`)

Botão "Ir para pagamento" que valida os 3 campos e chama `onConfirm({ name, email, document })`.

Sem campo de endereço, telefone, ou qualquer outra coisa — o Pagar.me coleta o resto no checkout hospedado.

### 2. Atualizar `src/lib/pagarmeCheckout.ts`

Adicionar parâmetro opcional `customer` na função `redirectToCheckout`:
```typescript
export async function redirectToCheckout(
  productSlug: string,
  customer?: { name: string; email: string; document: string }
): Promise<void>
```

Enviar `customer_name`, `customer_email`, `customer_document` no body do fetch.

### 3. Atualizar edge function `create-pagarme-checkout-v2/index.ts`

Receber `customer_name`, `customer_email`, `customer_document` do body. Montar o objeto `customer` com esses dados reais:
```typescript
customer: {
  name: customer_name,
  email: customer_email,
  type: 'individual',
  document: customer_document,
  document_type: 'CPF',
}
```

### 4. Atualizar `PlanosUpscalerArcano.tsx`

- Importar `CheckoutCustomerModal`
- Estado: `checkoutSlug` (string | null)
- `handlePurchase` → abre o modal setando `checkoutSlug`
- `onConfirm` do modal → chama `redirectToCheckout(checkoutSlug, customerData)`
- Fechar modal ao cancelar

## Arquivos

| Arquivo | Alteração |
|---|---|
| `src/components/checkout/CheckoutCustomerModal.tsx` | Criar — modal com Nome, Email, CPF |
| `src/lib/pagarmeCheckout.ts` | Aceitar `customer` opcional e enviar no body |
| `supabase/functions/create-pagarme-checkout-v2/index.ts` | Receber dados do customer do body e montar objeto real |
| `src/pages/PlanosUpscalerArcano.tsx` | Abrir modal antes de redirecionar |

