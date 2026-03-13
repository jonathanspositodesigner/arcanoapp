
# Migração Planos Mensais/Anuais: Greenn → Pagar.me (CONCLUÍDA v2 - Recorrência Real)

## Resumo
Migração dos 8 planos de assinatura (4 planos × 2 períodos) da Greenn para o Pagar.me com **recorrência real via cartão de crédito** e PIX como pagamento avulso.

## Decisão Arquitetural
- **Cartão de Crédito**: Recorrência real via `POST /subscriptions` do Pagar.me. Tokenização do cartão no front-end via API pública (`pk_XXXX`). Cobrança automática a cada ciclo.
- **PIX**: Checkout avulso (sem recorrência) — plano ativa por 30/365 dias. pg_cron expira planos vencidos.
- **Reembolso**: Cancela subscription no Pagar.me (`DELETE /subscriptions/{id}`) + revoga plano → free + zera créditos.

## O que foi feito

### 1. Banco de Dados
- Colunas `plan_slug` e `billing_period` em `mp_products`
- Coluna `pagarme_subscription_id` em `asaas_orders` e `planos2_subscriptions`
- 8 produtos inseridos: `plano-{starter,pro,ultimate,unlimited}-{mensal,anual}`

### 2. CreditCardForm.tsx (NOVO)
- Formulário seguro com campos: Número, Nome, Validade, CVV
- Tokenização direta via `POST https://api.pagar.me/core/v5/tokens?appId=pk_XXX`
- Retorna `card_token` para o fluxo de subscription

### 3. create-pagarme-subscription (NOVO)
- Edge function que cria subscription recorrente via `POST /subscriptions`
- Suporta `interval: month` ou `year` baseado no `billing_period` do produto
- Salva `pagarme_subscription_id` na ordem

### 4. webhook-pagarme (ATUALIZADO)
- Busca ordens por `pagarme_subscription_id` (fallback 4)
- Trata `subscription.canceled`: revoga plano → free, zera créditos
- Trata renovação (`charge.paid` em ordem já `paid`): renova plano + reseta créditos
- Salva `pagarme_subscription_id` no `planos2_subscriptions`

### 5. refund-pagarme (ATUALIZADO)
- Cancela subscription no Pagar.me via `DELETE /subscriptions/{id}` antes de revogar
- Revoga plano → free + zera créditos

### 6. Planos2.tsx (ATUALIZADO)
- Cartão: abre CreditCardForm → tokeniza → create-pagarme-subscription → recorrência real
- PIX: mantém checkout avulso via create-pagarme-checkout → 30/365 dias sem recorrência
- Flag `isSubscriptionFlow` diferencia fluxos de assinatura vs créditos avulsos
