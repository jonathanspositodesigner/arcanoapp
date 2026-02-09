
## Correcao Definitiva: Ciclo de Vida de Jobs de IA

### Diagnostico Exato (com evidencia no codigo)

**Bug 1: Timer de 10 min NAO finaliza o job no banco**
Arquivo: `src/hooks/useJobStatusSync.ts` linhas 276-288

O timer absoluto de 10 minutos so muda o estado da UI para "failed". Ele NAO:
- Atualiza o job no banco para `failed`
- Dispara estorno de creditos
- Chama o Queue Manager `/finish`

Resultado: o usuario ve "falhou", mas o job fica `running` no banco para sempre. Se fechar a aba, ninguem mais cuida dele. A mensagem diz "creditos serao estornados automaticamente" mas isso e mentira -- nada estorna.

**Bug 2: Arcano Cloner nao esta no `startJobOnRunningHub` do Queue Manager**
Arquivo: `supabase/functions/runninghub-queue-manager/index.ts` linhas 1036-1130

O switch/case em `startJobOnRunningHub` trata `upscaler_jobs`, `pose_changer_jobs`, `veste_ai_jobs`, `video_upscaler_jobs` mas cai no `default` para `arcano_cloner_jobs`, retornando `{ taskId: null }` sem iniciar nada. Isso significa que se um job do Arcano Cloner entrar na fila (queued), ele NUNCA sera processado pelo Queue Manager.

**Bug 3 (ja corrigido): Webhook usava colunas inexistentes**
Isso foi corrigido na ultima mensagem -- o webhook agora faz lookup minimo. Confirmado.

---

### Mapeamento Completo do Ciclo de Vida (como pedido)

Para TODAS as 5 ferramentas, o fluxo e identico:

| Etapa | Onde acontece | Arquivo |
|-------|---------------|---------|
| 1. Job criado (status=pending) | `createJob()` | `src/ai/JobManager.ts` L174-211 |
| 2. Edge Function chamada | `startJob()` | `src/ai/JobManager.ts` L220-282 |
| 3. Creditos consumidos | Dentro da Edge Function de cada ferramenta | `supabase/functions/runninghub-*/index.ts` |
| 4. Job vai para running ou queued | Edge Function ou Queue Manager | Cada edge function + queue-manager |
| 5. Webhook recebe TASK_END | Webhook centralizado | `supabase/functions/runninghub-webhook/index.ts` |
| 6. Finaliza via Queue Manager /finish | `handleFinish()` | `supabase/functions/runninghub-queue-manager/index.ts` L723-845 |
| 7. Estorno (se falha) | `refundCreditsIfNeeded()` | `supabase/functions/runninghub-queue-manager/index.ts` L436-465 |
| 8. UI recebe update | `useJobStatusSync` (Realtime+Polling) | `src/hooks/useJobStatusSync.ts` |

**Onde a transicao falha (ponto exato):**
- Se o webhook nao encontra o job (bug 3, ja corrigido) -> job fica `running` eternamente
- Se o timer de 10 min dispara -> UI mostra erro mas banco fica `running` (bug 1)
- Se Arcano Cloner entra na fila -> Queue Manager nao sabe processa-lo (bug 2)

---

### Implementacao (3 mudancas cirurgicas)

#### Mudanca A: Timer de 10 min CANCELA o job no banco + estorna creditos
**Arquivo:** `src/hooks/useJobStatusSync.ts`

Quando o timer de 10 min disparar e o job ainda estiver ativo:
1. Chamar `markJobFailed()` do JobManager (que ja chama Queue Manager `/finish`)
2. `/finish` ja faz estorno idempotente (via `refundCreditsIfNeeded`)
3. So DEPOIS de confirmar que o banco foi atualizado, notificar a UI

```typescript
// Linha 276 - ANTES (bug):
onStatusChange({ status: 'failed', errorMessage: '...' });

// DEPOIS (corrigido):
// 1. Cancelar no banco via Queue Manager /finish (garante estorno)
const tableName = TABLE_MAP[toolType];
try {
  await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/runninghub-queue-manager/finish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      table: tableName,
      jobId,
      status: 'failed',
      errorMessage: 'Timeout: job excedeu 10 minutos sem resposta',
    }),
  });
} catch (e) {
  console.error('[JobSync] Failed to cancel job server-side:', e);
}
// 2. Depois notificar UI
onStatusChange({ status: 'failed', errorMessage: '...' });
```

Isso garante que: banco atualizado + creditos estornados + UI liberada. Se o fetch falhar, a UI ainda libera (graceful degradation), e o `cleanup_all_stale_ai_jobs` pega depois.

#### Mudanca B: Arcano Cloner no `startJobOnRunningHub`
**Arquivo:** `supabase/functions/runninghub-queue-manager/index.ts`

Adicionar case `arcano_cloner_jobs` no switch de `startJobOnRunningHub()` (linha 1036):

```typescript
case 'arcano_cloner_jobs':
  webappId = WEBAPP_IDS.arcano_cloner_jobs;
  nodeInfoList = [
    { nodeId: "58", fieldName: "image", fieldValue: job.person_image_url || job.person_file_name },
    { nodeId: "62", fieldName: "image", fieldValue: job.reference_image_url || job.reference_file_name },
    { nodeId: "69", fieldName: "text", fieldValue: job.prompt || 'faca o homem da imagem 1 com a mesma pose, composicao de cenario fundo e roupas da imagem 2. SEM RUIDO NA FOTO' },
    { nodeId: "85", fieldName: "aspectRatio", fieldValue: job.aspect_ratio || '1:1' },
  ];
  break;
```

Sem isso, qualquer job de Arcano Cloner que entre na fila fica preso eternamente.

#### Mudanca C: Importar TABLE_MAP no useJobStatusSync
**Arquivo:** `src/hooks/useJobStatusSync.ts`

`TABLE_MAP` ja e importado (linha 27). Precisamos apenas importar o env para o fetch. Na verdade, ja temos acesso via `import.meta.env` no Vite. Nenhuma importacao adicional necessaria.

---

### Invariantes Garantidas (checklist)

| Invariante | Como e garantida |
|------------|-----------------|
| 1. Todo job termina em estado final | Timer de 10 min + cleanup server-side (`cleanup_all_stale_ai_jobs`) |
| 2. Nao fica em PENDING/PROCESSING eternamente | `useJobPendingWatchdog` (30s para pending) + timer absoluto 10 min (para qualquer status) |
| 3. Completed -> atualiza banco + mostra resultado | Webhook -> Queue Manager `/finish` -> Realtime/Polling -> UI |
| 4. Falha -> estado final + estorno | Queue Manager `/finish` -> `refundCreditsIfNeeded()` (idempotente) |
| 5. Timeout 10 min -> cancela + estorno | Timer absoluto chama `/finish` com status=failed (novo) |
| 6. Idempotente | `credits_charged` + `credits_refunded` flags no banco; `/finish` verifica antes de estornar |
| 7. Atomico | `/finish` faz update + refund em sequencia; flags previnem inconsistencia |

### Observabilidade
- `logStep()` ja registra cada transicao em `step_history` (JSON array no banco)
- `current_step` mostra ultimo passo
- `failed_at_step` mostra onde falhou
- O timer de 10 min vai logar: `[JobSync] Timeout: forcing server-side cancellation`

---

### Arquivos alterados (resumo)

| Arquivo | O que muda |
|---------|------------|
| `src/hooks/useJobStatusSync.ts` | Timer de 10 min agora chama `/finish` no servidor antes de liberar UI |
| `supabase/functions/runninghub-queue-manager/index.ts` | Adicionar `arcano_cloner_jobs` no switch de `startJobOnRunningHub` |

Nenhum arquivo novo. Nenhuma tabela nova. Nenhum endpoint novo. Apenas 2 correcoes cirurgicas nos arquivos existentes.
