

## Diagnóstico Completo

### O que aconteceu com djcristianorangel@gmail.com

**Timeline:**
- **08/03 às 03:46**: Greenn enviou DOIS webhooks "paid" com 3 segundos de diferença (03:46:41 e 03:46:44) para o mesmo pagamento. Ambos foram processados pelo fluxo Planos2 no `webhook-greenn`, cada um chamando `reset_upscaler_credits` com +4.200 créditos. **Resultado: créditos duplicados.**
- **12/03 e 13/03**: Tentativas de cobrança recorrente da Greenn foram **recusadas** (cartão recusado).
- **14/03**: Greenn enviou webhook "canceled" → o sistema zerou os créditos mensais e rebaixou para plano Free.

### Dois bugs identificados

**Bug 1 — Race condition na idempotência do Planos2:** O check de idempotência (linha 397-412 do `webhook-greenn`) busca `result = 'success'` no `webhook_logs`. Quando dois webhooks chegam com ~3s de diferença, o segundo inicia ANTES do primeiro ter escrito `result: 'success'`, então ambos passam no check e processam os créditos duplicados.

**Bug 2 — Cancelamento cego:** O fluxo de cancelamento (linhas 693-748) zera créditos de QUALQUER plano ativo do usuário quando recebe "canceled", sem verificar se o cancelamento se refere ao mesmo produto/contrato que ativou aquele plano. Se o usuário tiver planos em diferentes gateways, um cancelamento da Greenn zera tudo indiscriminadamente.

---

## Plano de Correção

### 1. Correção imediata do cliente
- SQL migration para restaurar os créditos do usuário `fa3e19e0-edb7-42c3-bc08-e9037f9a8d84`
- Definir qual é a situação correta: se ele pagou em 08/03 e o cartão foi recusado na renovação de 12/03, ele tinha direito ao período até ~07/04. Como já passou 14/03 com cancelamento, precisa de decisão manual (restaurar como cortesia ou manter zerado)

### 2. Fix do race condition na idempotência (webhook-greenn)
**Arquivo:** `supabase/functions/webhook-greenn/index.ts`

- No fluxo Planos2 (`processPlanos2Webhook`): ANTES de processar créditos, inserir o `webhook_logs` com `result: 'processing'` e verificar idempotência usando o `contractId` diretamente na tabela `planos2_subscriptions` (via `last_credit_reset_at`) em vez de depender do status do log
- Alternativa mais robusta: Fazer o check de idempotência comparando `contractId + status paid` diretamente e usar uma janela de tempo (ex: se já houve um success para o mesmo contractId nos últimos 60 segundos, ignorar)

### 3. Fix do race condition no fluxo legacy premium
**Arquivo:** `supabase/functions/webhook-greenn/index.ts`

- Adicionar check de idempotência no fluxo legacy (linhas 556-689) similar ao do Planos2: verificar se já existe um `webhook_logs` com `greenn_contract_id` e `result: 'success'` antes de processar

### 4. Melhoria no cancelamento (opcional, mas recomendado)
- No fluxo de cancelamento, verificar se o `contractId` do webhook de cancelamento corresponde ao `greenn_contract_id` da subscription ativa antes de revogar, para evitar cancelamentos cruzados

## Detalhes Técnicos

**Idempotência robusta proposta** — Substituir o check atual por uma abordagem de "lock otimista":
```sql
-- Tentar marcar o log como 'processing' com UPDATE condicional
UPDATE webhook_logs SET result = 'processing' 
WHERE id = logId AND result IS NULL
RETURNING id
```
Se o UPDATE retorna 0 rows, outro webhook já está processando → ignorar.

**Arquivos afetados:**
- `supabase/functions/webhook-greenn/index.ts` (idempotência Planos2 + legacy + cancelamento)
- Migration SQL para restaurar créditos do cliente

