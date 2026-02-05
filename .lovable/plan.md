

# Correção dos Conflitos: `createJob` e `markJobFailed`

## Conflitos Identificados

### Conflito 1: `markJobFailed` (CRÍTICO)
**Problema:** O `JobManager.ts` (frontend) marca jobs como `failed` diretamente no banco SEM reembolsar créditos.

```typescript
// JobManager.ts linhas 283-302 - PROBLEMÁTICO
async function markJobFailed(tableName, jobId, errorMessage) {
  await supabase.from(tableName).update({
    status: 'failed',
    error_message: errorMessage,
    completed_at: new Date().toISOString(),
  }).eq('id', jobId);
}
```

**Consequência:** Se o frontend falhar em comunicar com a edge function, o job vai para FAILED mas os créditos NÃO são reembolsados.

**Solução:** Chamar o endpoint `/finish` do QueueManager ao invés de update direto. O QueueManager já tem lógica de reembolso idempotente (linhas 184-213).

---

### Conflito 2: `createJob` (MENOR)
**Problema:** O `JobManager.ts` cria jobs com `status: 'queued'` antes de saber se há vaga.

```typescript
// JobManager.ts linhas 179-184 - INCONSISTENTE
const insertData = {
  session_id: sessionId,
  user_id: userId,
  status: 'queued' as const,  // ← Define antes de verificar
  ...payload,
};
```

**Consequência:** Jobs entram como `queued` mesmo quando poderiam ir direto para `starting` ou `running`.

**Solução:** Criar com `status: 'pending'` (estado inicial neutro) e deixar a edge function decidir o estado real após verificar a fila.

---

## Correções a Implementar

### 1. Corrigir `markJobFailed` (JobManager.ts)

**Antes:**
```typescript
async function markJobFailed(tableName, jobId, errorMessage) {
  await supabase.from(tableName).update({
    status: 'failed',
    error_message: errorMessage,
    completed_at: new Date().toISOString(),
  }).eq('id', jobId);
}
```

**Depois:**
```typescript
async function markJobFailed(tableName, jobId, errorMessage) {
  try {
    // Chamar QueueManager /finish para garantir reembolso
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/runninghub-queue-manager/finish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          table: tableName,
          jobId: jobId,
          status: 'failed',
          errorMessage: errorMessage,
        }),
      }
    );
    
    if (!response.ok) {
      console.error('[JobManager] markJobFailed via QueueManager failed:', response.status);
      // Fallback: update direto (sem reembolso, mas pelo menos marca)
      await supabase.from(tableName).update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      }).eq('id', jobId);
    }
  } catch (error) {
    console.error('[JobManager] markJobFailed exception:', error);
  }
}
```

---

### 2. Corrigir `createJob` (JobManager.ts)

**Antes:**
```typescript
const insertData = {
  session_id: sessionId,
  user_id: userId,
  status: 'queued' as const,
  ...payload,
};
```

**Depois:**
```typescript
const insertData = {
  session_id: sessionId,
  user_id: userId,
  status: 'pending' as const,  // Estado neutro - edge function decide
  ...payload,
};
```

---

### 3. Atualizar tipo `JobStatus`

Adicionar `'pending'` como estado válido:

```typescript
export type JobStatus = 'pending' | 'queued' | 'starting' | 'running' | 'completed' | 'failed' | 'cancelled';
```

---

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/ai/JobManager.ts` | Corrigir `markJobFailed` + `createJob` + tipo `JobStatus` |

---

## Fluxo Após Correção

```text
1. createJob() → insere com status: 'pending'
2. startJob() → chama edge function
   └─ Se falhar comunicação → markJobFailed() → chama /finish → REEMBOLSA
3. Edge function:
   └─ Verifica fila via /check
   └─ Se há vaga → status: 'starting'/'running'
   └─ Se não há vaga → status: 'queued' (enqueue)
4. Webhook → chama /finish → finaliza + reembolsa se falhou
```

---

## Benefícios

1. **Reembolso garantido:** Todo job que falha passa pelo QueueManager `/finish`
2. **Status consistente:** Edge function decide estado inicial, não o frontend
3. **Idempotência mantida:** QueueManager continua verificando flags antes de reembolsar
4. **Fallback seguro:** Se `/finish` falhar, ainda marca como failed (sem reembolso, mas evita job preso)

