

# Plano: Recorrência Real com Pagar.me (Assinatura com Cobrança Automática)

## O Problema Atual

Hoje os planos funcionam como **pagamento avulso**: o cliente paga uma vez, o plano ativa por 30/365 dias, e quando expira o cliente precisa voltar e pagar de novo manualmente. **Não existe cobrança automática.**

## Como Funciona a Recorrência no Pagar.me

O Pagar.me **não permite criar subscriptions pelo checkout hosted** (aquela página onde o cliente preenche o cartão). Para recorrência real, é preciso:

1. **Tokenizar o cartão no front-end** usando a API pública: `POST https://api.pagar.me/core/v5/tokens?appId=pk_XXXX`
2. **Enviar o `card_token` para o backend** que cria a subscription via `POST /subscriptions`
3. O Pagar.me cobra automaticamente a cada ciclo e envia webhooks (`charge.paid`, `subscription.canceled`, etc.)

**PIX não suporta recorrência** — só cartão de crédito. Para PIX, mantemos o modelo atual (pagamento avulso + plano por 30/365 dias).

## Pré-requisito

Preciso da **chave pública do Pagar.me** (`pk_XXXX`) para tokenizar cartões no front-end. Hoje só existe a `PAGARME_SECRET_KEY`. O usuário precisa adicionar o secret `PAGARME_PUBLIC_KEY`.

## Implementação

### 1. Adicionar Secret `PAGARME_PUBLIC_KEY`
- Solicitar ao usuário a chave pública do Pagar.me (encontrada no dashboard Pagar.me)

### 2. Componente de Formulário de Cartão (`CreditCardForm.tsx`)
- Formulário seguro com campos: Número, Nome, Validade, CVV
- Ao submeter, chama `POST https://api.pagar.me/core/v5/tokens?appId=pk_XXX` direto do browser
- Retorna o `card_token` para o fluxo de checkout

### 3. Nova Edge Function `create-pagarme-subscription`
- Recebe: `{ product_slug, card_token, user_email, user_name, user_cpf, user_phone, user_address, utm_data }`
- Cria ordem em `asaas_orders` (status: pending)
- Chama `POST https://api.pagar.me/core/v5/subscriptions` com:
  ```
  payment_method: 'credit_card'
  interval: 'month' ou 'year'
  interval_count: 1
  billing_type: 'prepaid'
  card: { card_token }
  customer: { name, email, document, phones }
  items: [{ description, quantity: 1, pricing_scheme: { price: centavos } }]
  metadata: { order_id }
  ```
- Salva `pagarme_subscription_id` na ordem e retorna sucesso

### 4. Atualizar `webhook-pagarme` para Eventos de Subscription
- Novo handler para `subscription.created`, `charge.paid` (de subscription), `subscription.canceled`
- Na `charge.paid` de subscription: busca a ordem pelo `subscription_id` no metadata, ativa/renova plano
- Na `subscription.canceled`: revoga plano → free, zera créditos
- Lógica de renovação: a cada `charge.paid`, recalcula `expires_at` (+30d ou +365d) e reseta créditos

### 5. Atualizar `refund-pagarme` para Cancelar Subscriptions
- Quando produto é subscription e tem `pagarme_subscription_id`:
  - `DELETE /subscriptions/{id}` para cancelar no Pagar.me
  - Revogar plano → free + zerar créditos

### 6. Frontend: Fluxo de Assinatura em `Planos2.tsx`
- **Cartão de Crédito**: Ao clicar "Assinar" → coleta dados do perfil → abre `CreditCardForm` → tokeniza → chama `create-pagarme-subscription` → confirma
- **PIX**: Mantém fluxo atual (checkout avulso via `create-pagarme-checkout`, plano ativa por 30/365 dias sem recorrência)
- Informar ao cliente que PIX não tem renovação automática

### 7. Banco de Dados
- Adicionar coluna `pagarme_subscription_id` em `asaas_orders` (se não existir já)
- Os 8 produtos de subscription na `mp_products` já foram criados na migração anterior

## Resumo dos Arquivos

| Arquivo | Ação |
|---|---|
| `src/components/checkout/CreditCardForm.tsx` | **NOVO** — formulário de cartão + tokenização |
| `supabase/functions/create-pagarme-subscription/index.ts` | **NOVO** — cria subscription recorrente |
| `supabase/functions/webhook-pagarme/index.ts` | EDITAR — tratar eventos de subscription |
| `supabase/functions/refund-pagarme/index.ts` | EDITAR — cancelar subscription no reembolso |
| `src/pages/Planos2.tsx` | EDITAR — fluxo cartão → form → subscription |

## Fluxo Visual

```text
CARTÃO DE CRÉDITO (recorrência real):
  Botão "Assinar" → PreCheckoutModal (se incompleto) → CreditCardForm
  → Tokeniza cartão (API pública Pagar.me) → create-pagarme-subscription
  → Pagar.me cria subscription → webhook charge.paid → ativa plano
  → Todo mês: Pagar.me cobra → webhook charge.paid → renova plano

PIX (sem recorrência):
  Botão "Assinar" → PreCheckoutModal → create-pagarme-checkout (avulso)
  → Checkout Pagar.me → webhook order.paid → ativa plano 30/365 dias
  → Expira → pg_cron desativa → cliente paga de novo manualmente
```

