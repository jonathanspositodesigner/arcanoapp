

## Correção: Créditos em Dobro no webhook-pagarme

### Causa raiz confirmada

Linha 411 do `webhook-pagarme/index.ts`:
```typescript
if ((eventType === 'order.paid' || eventType === 'charge.paid') && order.status === 'pending') {
```

O Pagar.me envia **dois eventos simultâneos** (`order.paid` + `charge.paid`) para cada pagamento. Cada um tem um `eventId` diferente, então a idempotência (linha 321-333) não detecta a duplicata. Ambos leem `order.status === 'pending'` e processam — **créditos em dobro**.

Isso afeta **todas as compras** (créditos, packs, tudo).

### Correção

Substituir a checagem de `order.status === 'pending'` por um **update atômico** que só permite um processamento:

```typescript
// ANTES (race condition):
if ((eventType === 'order.paid' || eventType === 'charge.paid') && order.status === 'pending') {

// DEPOIS (atômico):
const { data: lockedOrder, error: lockError } = await supabase
  .from('asaas_orders')
  .update({ status: 'processing', updated_at: new Date().toISOString() })
  .eq('id', order.id)
  .eq('status', 'pending')  // só atualiza se AINDA estiver pending
  .select('id')
  .maybeSingle()

if (lockedOrder) {
  // Processar pagamento (créditos, packs, emails, etc.)
  // No final, atualizar para 'paid'
}
```

O primeiro webhook que chegar faz `pending → processing` e processa. O segundo tenta o mesmo update mas não encontra `status = 'pending'` (já é `processing`), retorna 0 rows, e é ignorado.

### Arquivos editados

1. **`supabase/functions/webhook-pagarme/index.ts`** — substituir check na linha 411 por update atômico

### O que NÃO muda
- Nenhuma mudança no frontend
- Nenhuma mudança nas RPCs de créditos
- Nenhuma mudança nos webhooks de artes/Greenn/Hotmart
- A lógica de processamento (créditos, packs, emails, cartão salvo) permanece idêntica — só muda a **guarda de entrada**

