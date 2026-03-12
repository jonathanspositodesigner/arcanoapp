
# Migração Planos Mensais/Anuais: Greenn → Pagar.me (CONCLUÍDA)

## Resumo
Migração dos 8 planos de assinatura (4 planos × 2 períodos) da Greenn para o checkout Pagar.me, reutilizando a infraestrutura existente (`create-pagarme-checkout` + `webhook-pagarme`).

## Decisão Arquitetural
- **Sem edge function nova**: Pagar.me não suporta checkout hosted para subscriptions (requer tokenização de cartão). Solução: usar o mesmo checkout de pagamento avulso existente e ativar o plano por 30/365 dias.
- **PIX + Cartão suportados**: mesmo fluxo dos créditos avulsos.
- **Sem auto-renovação**: o plano expira após o período. O pg_cron existente (`expire_planos2_subscriptions`) já cuida de expirar planos.

## O que foi feito

### 1. Banco de Dados
- Colunas `plan_slug` e `billing_period` adicionadas a `mp_products`
- Coluna `pagarme_subscription_id` adicionada a `asaas_orders` e `planos2_subscriptions`
- 8 produtos inseridos: `plano-{starter,pro,ultimate,unlimited}-{mensal,anual}`

### 2. webhook-pagarme
- Novo bloco `product.type === 'subscription'`: ativa plano via `planos2_subscriptions` upsert + `reset_upscaler_credits`
- Reembolso: revoga para `free`, zera créditos mensais

### 3. refund-pagarme
- Novo bloco: quando produto é subscription, reseta `planos2_subscriptions` → free e zera créditos

### 4. Planos2.tsx (Frontend)
- Removidos todos os links Greenn (`paymentUrl`)
- Novo handler `handleSubscriptionPurchase` que usa o mesmo fluxo de checkout Pagar.me (PreCheckoutModal / PaymentMethodModal)
- Botão agora chama checkout interno em vez de `window.open(greennUrl)`
