

# Integração Mercado Pago — Upscaler Arcano (Sandbox)

## Resumo

Criar um sistema de checkout via Mercado Pago **apenas para o Upscaler Arcano vitalício** (produto 148481 da Greenn), usando credenciais de teste. O sistema Greenn permanece 100% intacto.

## Arquitetura

```text
Frontend (botão "Comprar")
    │
    ▼
Edge Function: create-mp-checkout
    │  ← recebe { product_slug, user_email }
    │  ← cria ordem em mp_orders
    │  ← chama API Mercado Pago (criar preferência)
    │
    ▼
Retorna checkout_url (init_point) → redireciona usuário
    │
    ▼
Mercado Pago processa pagamento
    │
    ▼
Edge Function: webhook-mercadopago
    │  ← recebe notificação { type: "payment", data: { id } }
    │  ← busca pagamento via GET /v1/payments/{id}
    │  ← encontra ordem via external_reference
    │  ← cria/busca usuário (mesma lógica do Greenn)
    │  ← insere user_pack_purchases (upscaller-arcano, vitalicio)
    │  ← atualiza mp_orders.status = paid
    │
    ▼
Usuário tem acesso ao Upscaler Arcano
```

## Etapas

### 1. Secret necessária
- `MERCADOPAGO_ACCESS_TOKEN` — token de teste do Mercado Pago (você fornece)

### 2. Tabelas novas (migration)

**`mp_products`** — catálogo interno de produtos para MP
- `id` (uuid), `slug` (text unique), `title`, `price` (numeric), `type` (text: pack/credits), `pack_slug` (text), `access_type` (text), `credits_amount` (int), `is_active` (boolean), `created_at`
- Pré-populada com 1 registro: Upscaler Arcano Vitalício (R$ 39,90)

**`mp_orders`** — ordens de compra
- `id` (uuid = external_reference), `user_email`, `user_id` (uuid nullable), `product_id` (ref mp_products), `amount` (numeric), `status` (text: pending/paid/refunded), `preference_id`, `mp_payment_id` (text), `created_at`, `updated_at`
- RLS: service role only (acessada apenas pelas Edge Functions)

### 3. Edge Function: `create-mp-checkout`
- Recebe `{ product_slug, user_email }` (sem JWT — público)
- Busca produto em `mp_products`
- Cria ordem em `mp_orders` com status `pending`
- Chama `POST https://api.mercadopago.com.br/checkout/preferences` com items, external_reference (= order id), back_urls, payer.email
- Retorna `{ checkout_url }` para o frontend

### 4. Edge Function: `webhook-mercadopago`
- Recebe POST do MP: `{ type: "payment", data: { id } }`
- Busca pagamento via `GET https://api.mercadopago.com.br/v1/payments/{id}`
- Lê `external_reference` → busca ordem em `mp_orders`
- Se `status === "approved"` e ordem pendente:
  - Cria/busca usuário (mesma lógica: `auth.admin.createUser`, fallback profile)
  - Upsert profile
  - Insere `user_pack_purchases` com `pack_slug = 'upscaller-arcano'`, `access_type = 'vitalicio'`
  - Atualiza `mp_orders.status = 'paid'`
- Se `status === "refunded"`: desativa acesso

### 5. Frontend — Página `PlanosUpscalerArcano69v2.tsx`
- Alterar `handlePurchase` para chamar `create-mp-checkout` em vez de abrir link Greenn
- Ao receber `checkout_url`, redirecionar via `window.location.href`

### 6. Config.toml
```toml
[functions.create-mp-checkout]
verify_jwt = false

[functions.webhook-mercadopago]
verify_jwt = false
```

## O que NÃO muda
- Nenhuma Edge Function da Greenn é alterada
- Tabelas existentes (webhook_logs, user_pack_purchases, profiles, upscaler_credits) não são modificadas na estrutura
- RPCs existentes são reutilizadas
- Créditos avulsos continuam pela Greenn por enquanto

## Próximo passo
Preciso que você forneça o **MERCADOPAGO_ACCESS_TOKEN** (credencial de teste). Me avise quando estiver pronto para enviar.

