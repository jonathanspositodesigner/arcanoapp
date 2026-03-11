

## Diagnóstico: Por que o Queue Check demora 7s

O `/check` do `runninghub-queue-manager` é o gargalo principal. Cada chamada executa:

```text
1. cleanupStaleJobs()
   - RPC cleanup_all_stale_ai_jobs           ~1 query
   - cleanupOrphanPendingJobs()              ~8 queries (1 por tabela)
   
2. getGlobalRunningCount()                   ~8 queries (1 por tabela)

3. getTotalQueuedCount()                     ~8 queries (1 por tabela)

4. getAccountWithAvailableSlot()
   - Para CADA conta (até 5), chama getRunningCountByAccount()
   - getRunningCountByAccount() = 8 queries por conta
   - Total: até 5 × 8 = 40 queries

TOTAL: até ~65 queries sequenciais por chamada /check
+ cold start da edge function (~30-100ms)
```

Isso explica os 7.3 segundos. Cada query leva ~50-100ms, e são feitas **sequencialmente**.

## Solução: Queue check direto no bg-remover

Em vez de chamar outra edge function (que tem cold start + 65 queries), o `runninghub-bg-remover` pode fazer o check internamente com **uma única query otimizada** usando o Supabase client que já possui.

### Mudanças

**`supabase/functions/runninghub-bg-remover/index.ts`** — Substituir a chamada HTTP ao queue-manager `/check` por uma função local `quickQueueCheck()`:

```typescript
async function quickQueueCheck(): Promise<{slotsAvailable: number; accountName: string; accountApiKey: string}> {
  // Contar running/starting jobs em TODAS as tabelas com Promise.all (paralelo)
  const counts = await Promise.all(
    JOB_TABLES.map(table => 
      supabase.from(table).select('*', {count:'exact', head:true}).in('status', ['running','starting'])
    )
  );
  const globalRunning = counts.reduce((sum, r) => sum + (r.count || 0), 0);
  
  // Contar queued jobs em paralelo
  const queuedCounts = await Promise.all(
    JOB_TABLES.map(table =>
      supabase.from(table).select('*', {count:'exact', head:true}).eq('status', 'queued')
    )
  );
  const totalQueued = queuedCounts.reduce((sum, r) => sum + (r.count || 0), 0);
  
  const slotsAvailable = Math.max(0, 3 - globalRunning);
  const mustQueue = globalRunning >= 3 || totalQueued > 0;
  
  if (mustQueue) return {slotsAvailable: 0, accountName: 'primary', accountApiKey: RUNNINGHUB_API_KEY};
  return {slotsAvailable, accountName: 'primary', accountApiKey: RUNNINGHUB_API_KEY};
}
```

Isso reduz de **65 queries sequenciais + cold start** para **16 queries paralelas (2 batches de 8)**, sem cold start. Tempo estimado: **~200ms** em vez de 7s.

### O que NÃO muda

- O cleanup oportunístico continua rodando nos outros endpoints do queue-manager
- O `/enqueue` continua sendo chamado quando não há slots (mantém a fila FIFO)
- Todas as outras ferramentas continuam usando o queue-manager normalmente
- O flow de enfileiramento, créditos, webhook e realtime ficam intactos
- Multi-account support: como o bg-remover já usa apenas a key primária (`RUNNINGHUB_API_KEY`), a simplificação não perde funcionalidade

### Resultado esperado

```text
Queue check: 7.3s → ~0.2s (ganho de ~7s)
Total turnaround: ~21s → ~14s
```

