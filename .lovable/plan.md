

## Auditoria Completa: Sistema de Créditos — Bugs e Vulnerabilidades

### Resumo dos vetores de risco analisados

Analisei todos os webhooks (Greenn, Greenn-Creditos, Pagar.me), RPCs de créditos, cron jobs e fluxos de ativação. Segue o diagnóstico:

---

### BUG 1 — webhook-pagarme: `subscription.canceled` sem ordem zera créditos indiscriminadamente (CRÍTICO)

**Arquivo:** `supabase/functions/webhook-pagarme/index.ts` linhas 558-601

Quando chega `subscription.canceled` sem ordem associada, o sistema busca por `pagarme_subscription_id` e, se encontra, zera créditos e revoga para Free **sem verificar se o subscription_id corresponde ao plano ativo atual**. 

Cenário de bug: Usuário faz upgrade (sub_id=AAA → sub_id=BBB). Pagar.me cancela AAA. Mas `planos2_subscriptions` pode já estar com sub_id=BBB. O código busca por AAA, mas como faz `eq('pagarme_subscription_id', subIdToSearch)`, **só encontra se AAA ainda estiver lá**. Na prática, após upgrade, o campo já foi substituído por BBB, então esse caso específico é SEGURO por acidente. Porém, se o sub_id não foi atualizado (race condition), pode zerar o plano errado.

**Fix:** Adicionar verificação explícita: só revogar se o `pagarme_subscription_id` ativo no banco == o subscription_id do evento.

### BUG 2 — webhook-greenn-creditos: SEM optimistic lock (CRÍTICO)

**Arquivo:** `supabase/functions/webhook-greenn-creditos/index.ts`

O webhook de créditos avulsos da Greenn **não tem lock otimista**. A única proteção é a verificação de `greenn_contract_id` + `result=success` (linhas 742-761), mas isso tem janela de race condition: se dois webhooks chegam simultaneamente, ambos verificam antes de qualquer um marcar `success`, e os dois passam → **créditos em dobro**.

**Fix:** Adicionar optimistic lock (`update result='processing' where result='received'`) antes de processar, igual ao que já existe no webhook-greenn principal.

### BUG 3 — webhook-greenn-creditos: sem dedup quando não há contractId

Quando o webhook não envia `contractId`, não há nenhuma verificação de duplicidade. Qualquer retry da Greenn vai adicionar créditos novamente.

**Fix:** Quando não há contractId, usar `transaction_id` do log como chave de dedup, ou verificar se já existe um log `success` com mesmo `product_id` + `email` nos últimos 5 minutos.

### BUG 4 — confirm-email: créditos iniciais se balance=0 (BAIXO)

**Arquivo:** `supabase/functions/confirm-email/index.ts` linhas 170-185

Se o usuário consumir todos os créditos e de alguma forma re-confirmar email, ganha 300 créditos novamente. Na prática isso é improvável (confirmação é one-time), mas não está protegido.

**Fix:** Verificar se o registro de créditos já existe (`existingCredits` != null), independente do balance.

### BUG 5 — RPCs não têm proteção contra saldo negativo em edge cases

As RPCs `reset_upscaler_credits` e `add_lifetime_credits` não verificam se já estão sendo executadas para o mesmo user_id simultaneamente. A RPC `consume_upscaler_credits` usa `FOR UPDATE` (correto), mas as de reset/add não.

**Fix:** Adicionar `FOR UPDATE` (row-level lock) nas RPCs `reset_upscaler_credits` e `add_lifetime_credits` para evitar race conditions entre webhooks simultâneos que tentam resetar/adicionar créditos ao mesmo tempo.

---

### Correções Propostas

#### 1. webhook-greenn-creditos — Adicionar optimistic lock
Antes de processar créditos, adicionar lock atômico:
```typescript
const { data: lockResult } = await supabase
  .from('webhook_logs')
  .update({ result: 'processing' })
  .eq('id', logId)
  .eq('result', 'received')
  .select('id')
if (!lockResult || lockResult.length === 0) return // duplicata
```

#### 2. webhook-greenn-creditos — Fallback dedup sem contractId
Quando não há contractId, verificar logs recentes com mesmo email + product_id + result=success nos últimos 10 minutos.

#### 3. webhook-pagarme — Proteger subscription.canceled
Verificar que o `pagarme_subscription_id` no banco bate com o do evento antes de revogar.

#### 4. confirm-email — Corrigir check de créditos iniciais
Mudar de `!existingCredits || balance === 0` para `!existingCredits` apenas.

#### 5. RPCs — Adicionar FOR UPDATE em reset e add
Garantir que `reset_upscaler_credits` e `add_lifetime_credits` fazem `SELECT ... FOR UPDATE` antes de modificar saldos.

### Arquivos a editar
- `supabase/functions/webhook-greenn-creditos/index.ts` — lock + dedup
- `supabase/functions/webhook-pagarme/index.ts` — subscription.canceled check
- `supabase/functions/confirm-email/index.ts` — fix check créditos
- `supabase/migrations/` — RPCs com FOR UPDATE

