

## Auditoria Completa do Sistema de Créditos — Resultados

Fiz uma varredura completa em todos os webhooks, RPCs, cron jobs e fluxos de ativação/cancelamento. Eis os achados:

---

### ACHADO 1 — webhook-pagarme: NÃO seta `last_credit_reset_at` na ativação de plano (CRÍTICO)

**Arquivo:** `supabase/functions/webhook-pagarme/index.ts` linhas 990-1002

Quando uma assinatura é ativada via Pagar.me, o upsert em `planos2_subscriptions` **não inclui `last_credit_reset_at`**. O Greenn faz corretamente (linha 482), mas o Pagar.me não.

**Consequência:** Se o usuário tinha um plano anterior com `last_credit_reset_at` de 29 dias atrás, e faz upgrade via Pagar.me, o cron `reset_individual_monthly_credits` pode disparar um reset prematuro 1 dia depois (achando que já passaram 30 dias), dando créditos extras indevidos.

**Fix:** Adicionar `last_credit_reset_at: new Date().toISOString()` no upsert de `planos2_subscriptions` dentro do bloco de subscription activation do Pagar.me.

---

### ACHADO 2 — webhook-greenn: cancelamento sem `contractId` derruba qualquer plano ativo (MÉDIO)

**Arquivo:** `supabase/functions/webhook-greenn/index.ts` linhas 764-767

Lógica atual:
```typescript
const contractMatches = hasActivePlanos2 && (
  !webhookContractId || 
  String(planos2Sub.greenn_contract_id) === String(webhookContractId)
)
```

Quando `webhookContractId` é `undefined/null`, `!webhookContractId` é `true`, então `contractMatches = true`. Isso faz o cancelamento **sem contractId** resetar qualquer plano ativo para Free e zerar créditos, mesmo que o cancelamento seja de um produto completamente diferente (ex: pack avulso de artes).

**Fix:** Inverter a lógica — quando não há `webhookContractId` no evento de cancelamento e o usuário tem um plano ativo, NÃO revogar. Só revogar quando há match positivo explícito.

---

### ACHADO 3 — MercadoPago: sem dedup explícita para créditos (BAIXO)

**Arquivo:** `supabase/functions/webhook-mercadopago/index.ts` linha 399

A proteção existe via `order.status === 'pending'` — só processa se a ordem ainda está pending. Após processamento, o status muda para `paid`. Isso é **suficiente** como idempotência natural. **Sem ação necessária.**

---

### ACHADO 4 — `reset_upscaler_credits` com `_amount: 0` preserva lifetime corretamente (OK)

Confirmei que a RPC seta `monthly_balance = _amount` (0) e mantém `lifetime_balance` intacto. O `balance` fica como `_amount + lifetime_balance`. Correto.

---

### ACHADO 5 — `expire_landing_trial_credits` protege usuários pagos (OK)

A RPC verifica se o usuário tem subscription paga antes de zerar créditos. Se tem, só limpa a flag de trial sem tocar nos créditos. Correto.

---

### ACHADO 6 — `claim-promo-credits` tem dedup via `promo_claims` table (OK)

Verifica `existing_claim` antes de adicionar créditos. A tabela tem unique constraint. Seguro.

---

### ACHADO 7 — `confirm-email` créditos iniciais (OK — JÁ CORRIGIDO)

Agora verifica existência do registro (`!existingCredits`) ao invés de balance. Fix anterior está correto.

---

### ACHADO 8 — `process_referral` calcula balance incorretamente (BAIXO)

**Arquivo:** RPC `process_referral`

Na linha de update:
```sql
balance = upscaler_credits.monthly_balance + upscaler_credits.lifetime_balance + 150
```

Isso calcula o balance ANTES do update do lifetime (o lifetime no SET é `lifetime_balance + 150`, mas o balance usa `lifetime_balance` antigo + 150). O RETURNING ou o subsequente SELECT corrige, mas o valor de `balance` na tabela pode ficar inconsistente por um instante. Na prática, o `v_referred_balance` lido depois com SELECT está correto.

Porém a coluna `balance` na tabela fica com valor errado: `monthly + old_lifetime + 150` ao invés de `monthly + (old_lifetime + 150)`. Esses são iguais algebricamente, então **não há bug real**. Sem ação necessária.

---

### Resumo de Correções Necessárias

| # | Severidade | Problema | Fix |
|---|-----------|----------|-----|
| 1 | CRÍTICO | Pagar.me não seta `last_credit_reset_at` na ativação | Adicionar campo no upsert |
| 2 | MÉDIO | Greenn cancela qualquer plano quando não tem `contractId` | Não revogar sem match positivo |

### Arquivos a editar
- `supabase/functions/webhook-pagarme/index.ts` — adicionar `last_credit_reset_at` no upsert de subscription
- `supabase/functions/webhook-greenn/index.ts` — corrigir lógica de `contractMatches` para não revogar sem contractId

