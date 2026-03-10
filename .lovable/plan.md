

## One-Click Buy com Pagar.me — Plano de Implementação

### Como funciona na API Pagar.me v5

O Pagar.me v5 permite cobrar um cartão salvo usando `card_id` + `customer_id`. O fluxo:

1. **Primeira compra**: Cliente paga via checkout hosted → Pagar.me cria um `customer` com `customer_id` e salva o cartão como `card_id`
2. **Compras seguintes**: Usamos `POST /orders` direto com `customer_id` + `card_id` (sem redirecionar para checkout)

```text
┌─────────────────────────────────────────────────┐
│          FLUXO ONE-CLICK BUY                    │
│                                                 │
│  1ª Compra (checkout normal):                   │
│  Frontend → Edge Function → Pagar.me Checkout   │
│  Webhook → Salva customer_id + card_id no DB    │
│                                                 │
│  Compras seguintes (one-click):                 │
│  Frontend → Edge Function → POST /orders        │
│  (com customer_id + card_id, sem checkout)       │
│  → Resposta imediata → Webhook confirma         │
└─────────────────────────────────────────────────┘
```

### Alterações necessárias

**1. Nova tabela `pagarme_saved_cards`**
- `id` (uuid, PK)
- `user_id` (uuid, FK profiles)
- `pagarme_customer_id` (text) — ID do customer no Pagar.me
- `pagarme_card_id` (text) — ID do cartão salvo
- `card_last_four` (text) — últimos 4 dígitos para exibir
- `card_brand` (text) — bandeira (visa, mastercard, etc.)
- `is_active` (boolean, default true)
- `created_at` / `updated_at`
- RLS: usuário só vê seus próprios cartões

**2. Webhook `webhook-pagarme` — salvar dados do cartão**
Quando `order.paid` com `transaction_type = credit_card`:
- Extrair `customer.id` e `card.id` + `last_four_digits` + `brand` da resposta
- Salvar na tabela `pagarme_saved_cards` (upsert por user_id + card_id)

**3. Nova Edge Function `pagarme-one-click`**
- Recebe: `product_slug`, `card_id` (do nosso DB, não do Pagar.me)
- Valida que o usuário logado é dono do cartão
- Busca `pagarme_customer_id` e `pagarme_card_id` da tabela
- Cria pedido direto via `POST /orders` com `payment_method: credit_card` + `card_id`
- Retorna sucesso/erro imediatamente (o webhook cuida do resto)

**4. Frontend `PreCheckoutModal.tsx`**
- Para usuários logados: consultar se tem cartão salvo na `pagarme_saved_cards`
- Se tem cartão salvo, exibir opção "Comprar com 1 clique" mostrando `•••• 1234 (Visa)`
- Botão de one-click faz chamada direta à `pagarme-one-click` sem abrir checkout
- Manter opção "Usar outro cartão" que segue o fluxo normal de checkout
- Se não tem cartão salvo, fluxo normal como está hoje

### Experiência do usuário (logado com cartão salvo)

```text
┌──────────────────────────────────────┐
│       Finalizar Compra               │
│                                      │
│  💳 Cartão salvo                     │
│  ┌──────────────────────────────┐    │
│  │ •••• 4242  Visa         ✓   │    │
│  └──────────────────────────────┘    │
│                                      │
│  [  🔒 Comprar com 1 Clique    ]    │
│                                      │
│  ── ou ──                            │
│                                      │
│  Usar outro método de pagamento →    │
│                                      │
│  🔒 Pagamento 100% seguro           │
└──────────────────────────────────────┘
```

### Segurança
- O `card_id` e `customer_id` do Pagar.me ficam apenas no backend (nunca expostos ao frontend)
- A tabela `pagarme_saved_cards` usa um `id` interno como referência
- RLS garante que só o próprio usuário vê/usa seus cartões
- A Edge Function valida ownership antes de cobrar
- O usuário pode remover cartões salvos a qualquer momento

