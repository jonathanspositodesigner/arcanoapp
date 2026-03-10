

## Plano: Criar reembolso via API Pagar.me no sistema

### O que será feito

1. **Nova Edge Function `refund-pagarme`** — Recebe `order_id` de um admin autenticado, busca o `asaas_payment_id` (charge ID do Pagar.me), chama `POST /charges/{charge_id}/void` na API Pagar.me, revoga acesso e atualiza status da ordem para `refunded`.

2. **Botão de reembolso no `SaleDetailDialog`** — Para vendas com status `paid` e plataforma `pagarme`/`asaas`, exibir botão "Reembolsar via Pagar.me" com confirmação. Ao confirmar, chama a edge function e atualiza a UI.

### Detalhes técnicos

**Edge Function `refund-pagarme/index.ts`:**
- Validação de admin via `getClaims()` + `has_role()`
- Recebe `{ order_id }` no body
- Busca a ordem na `asaas_orders` com join em `mp_products`
- Chama `POST https://api.pagar.me/core/v5/charges/{asaas_payment_id}/void` com auth Basic
- Se sucesso: atualiza `asaas_orders.status = 'refunded'`, revoga `user_pack_purchases` e/ou créditos (mesma lógica do webhook de refund)
- Loga na `webhook_logs` como `event_type: 'manual_refund'`

**Config `supabase/config.toml`:**
- Adicionar `[functions.refund-pagarme]` com `verify_jwt = false`

**Frontend `SaleDetailDialog.tsx`:**
- Adicionar botão "Reembolsar" visível apenas quando `sale.status === 'paid'` e plataforma é Pagar.me (`source_platform` contém `asaas` ou `pagarme`)
- Dialog de confirmação antes de executar
- Chama `supabase.functions.invoke('refund-pagarme', { body: { order_id: sale.id } })`
- Exibe toast de sucesso/erro e fecha o dialog

