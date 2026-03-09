

# Corrigir duplicatas de vendas Hotmart-ES no dashboard

## Problema raiz

A Hotmart envia **dois webhooks** para cada venda:
1. `PURCHASE_APPROVED` — no momento da compra (ex: 1 de março)
2. `PURCHASE_COMPLETE` — dias depois (ex: 9 de março)

A função `get_unified_dashboard_orders` filtra por `received_at` dentro do período selecionado. Quando o dashboard mostra "hoje", ele pega os 8 webhooks `PURCHASE_COMPLETE` que chegaram hoje mas que são de compras feitas na semana passada. Como `greenn_contract_id` é NULL para entradas Hotmart, o `DISTINCT ON(COALESCE(greenn_contract_id, id::text))` não consegue deduplica-las — cada row tem um `id` único.

**Resultado**: 12 vendas mostradas (4 reais de hoje + 8 PURCHASE_COMPLETE de compras antigas).

## Correção

Alterar a RPC `get_unified_dashboard_orders` para **excluir `PURCHASE_COMPLETE`** dos status válidos de webhook. Esse evento é apenas uma confirmação tardia de uma compra já contada como `PURCHASE_APPROVED`. Remover de ambas as listas de status no SQL.

Statuses que ficam:
- Paid: `paid`, `approved`, `PURCHASE_APPROVED`
- Refunded: `refunded`, `chargeback`, `chargedback`, `PURCHASE_REFUNDED`, `PURCHASE_CHARGEBACK`
- Pending: `waiting_payment`, `pending_payment`, `PURCHASE_DELAYED`

**1 migration SQL** para atualizar a função.

