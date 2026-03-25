# Auditoria Completa: Jornada do Cliente por Tipo de Pagamento

## Estado Atual de Cada Fluxo

### 1. Créditos Avulsos (creditos-1500 / creditos-4200 / creditos-14000)

**Status: OK**

```text
Cliente clica "Comprar"
  → openCheckout(slug) via useMPCheckout
  → MPEmailModal coleta Nome/Email/CPF
  → redirectToMPCheckout → create-mp-checkout (Edge Function)
  → Cria ordem em mp_orders (status: pending)
  → Gera preferência no MP → retorna init_point
  → Cliente paga no Checkout Mercado Pago

Webhook (pagamento aprovado):
  → Busca ordem em mp_orders → produto tipo 'credits'
  → add_lifetime_credits (RPC) → créditos vitalícios
  → Concede acesso pack 'upscaller-arcano'
  → Email "Compra Confirmada" com bloco "X Créditos Adicionados!"
  → Meta CAPI Purchase + UTMify + Admin notification

Estorno:
  → revoke_lifetime_credits_on_refund
  → Revoga pack se não há outras compras de créditos
```

aqui ja ta errado, se a pessoa comprou creditos avulsos na platafora o que tem haver isso com conceder acesso ao pack 'upscaller-arcano'? esse produto não tem nada haver com a compra de creditos não tem que conceder acesso nenhum retire isso  
o estorno também não tem que revogar pack nenhum pois nao tem nada haver a pessoa pode ter comprado o pack arcano antes e só cancelou os creditos, só deve revogar aqueles creditos que ela comprou em especifico

### 2. Assinaturas Mensais (starter/pro/ultimate/unlimited-mensal)

**Status: OK (com 1 problema encontrado)**

```text
Cliente clica "Assinar"
  → handleSubscriptionPurchase(planName) monta slug: "plano-pro-mensal"
  → openCheckout(slug)
  → MPEmailModal → create-mp-checkout → MP Checkout
  → Cliente paga (cartão ou PIX)

Webhook (pagamento aprovado):
  → Produto tipo 'subscription', plan_slug: 'pro'
  → Upsert planos2_subscriptions (credits, image/video, cost_multiplier)
  → expires_at = agora + 30 dias
  → last_credit_reset_at = agora
  → reset_upscaler_credits com créditos do plano
  → Email "Plano Ativado com Sucesso!"

Recorrência (30 dias depois):
  → process-billing-reminders (cron diário)
  → Busca assinaturas com expires_at entre -1 e +5 dias
  → Gera preferência MP (createRenewalCheckout) → init_point
  → Envia sequência de 6 emails (day 0 a day 5) com link de checkout
  → Cliente clica no link → paga → webhook ativa novo ciclo

Estorno:
  → Upsert planos2_subscriptions → plan_slug: 'free'
  → Zera créditos mensais (reset_upscaler_credits com 0)
```

### 3. Assinaturas Anuais (starter/pro/ultimate/unlimited-anual)

**Status: OK**

Mesmo fluxo das mensais, com diferença:

- `expires_at = agora + 365 dias`
- Renovação via email acontece 1 ano depois
- `process-billing-reminders` sempre cobra o valor **mensal** na renovação (filtro `billing_period: 'mensal'`), o que é intencional — após 1 ano, o cliente renova mês a mês

### 4. Recovery Emails (send-pix-recovery-email)

**Status: OK**

```text
Cron executa send-pix-recovery-email
  → Busca ordens pendentes de HOJE em mp_orders
  → Gera novo checkout MP (generateCheckoutUrl)
  → Envia email "Seu pagamento não foi processado"
  → Cliente clica → paga → webhook processa normalmente
```

### 5. Upscaler Arcano Vitalício (upscaller-arcano-vitalicio)

**Status: OK**

- Compra via MP → webhook adiciona créditos do pack + 10.000 créditos bônus + habilita image/video generation
- Estorno revoga tudo (créditos bônus + image/video)  
  
***aqui só deve revogar os bonus que ele ganhou da compra os 10000 creditos não pode revogar outros creditos que ele comprou

### 6. Upscaler Arcano V3

**Status: OK**

- Compra via MP → webhook concede pack V3 + bônus pack V2 (sem créditos extras)
- Estorno revoga V3 + bônus V2

---

## Problema Encontrado

### PROBLEMA: `process-billing-reminders` verifica renovação na tabela errada

**Arquivo:** `supabase/functions/process-billing-reminders/index.ts`, linhas 434-457

A função verifica se o usuário já pagou a renovação buscando em `**asaas_orders**` (tabela do Pagar.me):

```typescript
const { data: recentOrder } = await supabase
  .from('asaas_orders')  // ← ERRADO — deveria ser mp_orders
  .select('id')
  .eq('user_email', userEmail)
  .eq('status', 'confirmed')  // ← ERRADO — no MP o status é 'paid'
  .gte('paid_at', expiresAt.toISOString())
```

**Impacto:** Se um cliente renovou pagando via Mercado Pago, mas o `expires_at` ainda não foi atualizado pelo webhook (por timing), a função **não detecta** que ele já pagou e envia o email de cobrança mesmo assim. Na prática, o primeiro check (`currentExpires > tomorrow`) mitiga isso na maioria dos casos, mas não é garantido se o webhook demorar.

**Correção:** Mudar para `mp_orders` com status `paid`.

---

## Resumo


| Fluxo               | Status | Observação                                                       |
| ------------------- | ------ | ---------------------------------------------------------------- |
| Créditos avulsos    | OK     | Checkout MP funcionando                                          |
| Assinaturas mensais | OK     | Ativação, créditos, email corretos                               |
| Assinaturas anuais  | OK     | 365 dias, renova como mensal                                     |
| Emails de cobrança  | 1 bug  | Query de renovação paga usa `asaas_orders` em vez de `mp_orders` |
| Recovery emails     | OK     | Já migrado para `mp_orders`                                      |
| Estorno assinatura  | OK     | Reset para free + zera créditos                                  |
| Estorno créditos    | OK     | Revoga créditos + pack                                           |
| Email de compra     | OK     | Bloco específico para subscription                               |
| Email de recovery   | OK     | Texto menciona "instabilidade no Pix" (cosmético, funciona)      |


## Correção Necessária

1. `**process-billing-reminders` linhas 434-442**: Trocar `asaas_orders` → `mp_orders` e `status: 'confirmed'` → `status: 'paid'`