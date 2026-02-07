
# Plano: Correção Robusta do Bug do Watchdog e Prevenção de Duplicados

## Diagnóstico Completo

### Problema 1: O Watchdog NUNCA Dispara (Bug Crítico)
O hook `useJobPendingWatchdog` recebe `status` como parâmetro:
```typescript
// UpscalerArcanoTool.tsx linha 175-178
useJobPendingWatchdog({
  jobId,
  status,  // ← Este é ProcessingStatus: 'idle' | 'uploading' | 'processing' | ...
  toolType: 'upscaler',
  ...
});
```

O hook só ativa o timer quando `status === 'pending'`:
```typescript
// useJobPendingWatchdog.ts linha 55-56
if (!jobId || status !== 'pending') {
  // Limpar timeout se status mudou
  ...
  return;
}
```

**MAS** o `ProcessingStatus` da UI **NUNCA** é `'pending'`! Os valores possíveis são:
- `'idle' | 'uploading' | 'processing' | 'waiting' | 'completed' | 'error'`

O status do **banco de dados** é `'pending'`, mas a UI usa seus próprios estados. O watchdog compara maçãs com laranjas e NUNCA funciona.

### Problema 2: Usuários Criam Jobs Duplicados
O endpoint `check-user-active` (linha 489) só bloqueia se o usuário já tiver job com status:
- `running`, `queued`, `starting`

**NÃO inclui `pending`!** Então:
1. Usuário cria job A (status: `pending`)
2. Edge Function falha (job A fica órfão em `pending`)
3. Usuário tenta novamente
4. `check-user-active` retorna `hasActiveJob: false` (pending não conta)
5. Usuário cria job B normalmente
6. Admin vê: um `pending` e um `running` do mesmo usuário

---

## Solução em 3 Partes (Sem Quebrar Nada)

### Parte 1: Corrigir o Hook `useJobPendingWatchdog`

**Problema:** O hook depende de `status` da UI que nunca é `'pending'`.

**Solução:** Mudar a lógica para:
1. Iniciar timer quando existir `jobId` (independente do status da UI)
2. Após 30s, consultar o **banco de dados** para verificar se ainda está `pending` E `task_id IS NULL`
3. Se sim, marcar como failed e notificar usuário

**Mudança de contrato do hook:**
```typescript
// ANTES: depende de status da UI
useJobPendingWatchdog({
  jobId,
  status,  // ← ProcessingStatus (UI) - nunca é 'pending'
  toolType: 'upscaler',
  onJobFailed: ...
});

// DEPOIS: não depende de status da UI
useJobPendingWatchdog({
  jobId,
  toolType: 'upscaler',
  enabled: status !== 'idle' && status !== 'completed' && status !== 'error',
  onJobFailed: ...
});
```

**Por que é seguro:**
- O hook faz **verificação dupla** no banco antes de agir
- Só marca como failed se: `status === 'pending'` E `task_id IS NULL` E `created_at > 30s`
- Se o job já transitou para `queued/running/completed`, o hook NÃO faz nada

### Parte 2: Incluir `pending` Recente no Bloqueio de Duplicados

**Mudança:** No `handleCheckUserActive`, considerar `pending` como ativo **por 35 segundos**:

```sql
-- Adicionar à query
OR (
  status = 'pending' 
  AND task_id IS NULL 
  AND created_at > NOW() - INTERVAL '35 seconds'
)
```

**Por que 35 segundos?** Alinhado com o watchdog (30s + margem).

**Por que é seguro:**
- Após 35s, o pending órfão será limpo (pelo watchdog ou cleanup)
- Impede criação de jobs duplicados na janela de inicialização
- Jobs que iniciaram normalmente (task_id preenchido) não são afetados

### Parte 3: Cleanup Server-Side Oportunístico (30s)

Adicionar limpeza automática de `pending` órfãos em endpoints frequentes do `runninghub-queue-manager`:

```typescript
async function cleanupOrphanPendingJobs(): Promise<number> {
  // Para cada tabela, marcar como failed jobs com:
  // - status = 'pending'
  // - task_id IS NULL  
  // - created_at < NOW() - 30 segundos
}
```

Chamar no início de:
- `/check`
- `/check-user-active`
- `/process-next`
- `/finish`

**Por que é seguro:**
- Só afeta jobs que NUNCA iniciaram (`task_id IS NULL`)
- Jobs normais (em fila ou processando) têm `task_id` preenchido
- É idempotente (rodar múltiplas vezes não causa problemas)

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/hooks/useJobPendingWatchdog.ts` | MODIFICAR | Não depender de status UI, usar enabled flag |
| `src/pages/UpscalerArcanoTool.tsx` | MODIFICAR | Passar `enabled` ao invés de `status` |
| `src/pages/PoseChangerTool.tsx` | MODIFICAR | Mesma mudança |
| `src/pages/VesteAITool.tsx` | MODIFICAR | Mesma mudança |
| `src/pages/VideoUpscalerTool.tsx` | MODIFICAR | Mesma mudança |
| `supabase/functions/runninghub-queue-manager/index.ts` | MODIFICAR | Incluir pending no bloqueio + cleanup |

---

## Análise de Impacto: O Que NÃO Quebra

### Fila Global (3 jobs simultâneos)
- ✅ **NÃO AFETADO** - A fila continua usando `running`, `starting` para contar slots
- O `pending` não ocupa vaga na fila, apenas bloqueia duplicados do mesmo usuário

### Processamento Normal
- ✅ **NÃO AFETADO** - Jobs que iniciam normalmente transitam para `starting/queued/running`
- O watchdog verifica `task_id IS NULL` antes de agir

### Cleanup de 10 Minutos
- ✅ **NÃO AFETADO** - Continua funcionando como backup
- O cleanup de 30s é uma camada adicional, não substitui

### Reembolso de Créditos
- ✅ **NÃO AFETADO** - Jobs `pending` nunca cobram créditos (`credits_charged = false`)
- O reembolso só acontece para jobs que foram cobrados

### Edge Functions (Upscaler, Pose, Veste, Video)
- ✅ **NÃO AFETADO** - Nenhuma mudança nas Edge Functions de processamento

---

## Cenários de Teste

| Cenário | Comportamento Esperado |
|---------|------------------------|
| Job criado, Edge Function falha | Em 30s: job marcado `failed`, usuário vê erro |
| Job criado, usuário fecha aba | Em 30s: cleanup server-side marca `failed` |
| Job criado, processa normalmente | Watchdog detecta `task_id` preenchido, NÃO age |
| Usuário tenta criar 2º job em 10s | Bloqueado: "Você já tem job ativo" |
| Usuário tenta criar 2º job após 35s | Permitido: pending órfão já foi limpo |
| Job em fila normal | Não afetado: status é `queued`, não `pending` |

---

## Código: Hook Corrigido

```typescript
/**
 * useJobPendingWatchdog v2 - Agora FUNCIONA!
 * 
 * Mudanças:
 * - Não depende mais de status da UI
 * - Usa flag 'enabled' para ativar/desativar
 * - Faz verificação tripla no banco: status=pending AND task_id=null AND age>30s
 */
interface UseJobPendingWatchdogOptions {
  jobId: string | null;
  toolType: ToolType;
  enabled: boolean;  // ← NOVO: ativo quando está processando
  onJobFailed: (errorMessage: string) => void;
}

export function useJobPendingWatchdog({
  jobId,
  toolType,
  enabled,  // ← Controla se deve monitorar
  onJobFailed,
}: UseJobPendingWatchdogOptions) {
  // ...
  useEffect(() => {
    if (!enabled || !jobId) {
      // Limpar e sair
      return;
    }
    
    // Iniciar timer de 30s
    timeoutRef.current = setTimeout(async () => {
      // Consultar banco para verificação tripla
      const { data: job } = await supabase
        .from(tableName)
        .select('status, task_id, created_at')
        .eq('id', jobId)
        .maybeSingle();
      
      if (!job) return;
      
      // Só agir se: pending + sem task_id + mais de 30s
      const age = Date.now() - new Date(job.created_at).getTime();
      if (job.status === 'pending' && !job.task_id && age > 30000) {
        // Marcar como failed via RPC
        await supabase.rpc('mark_pending_job_as_failed', {...});
        onJobFailed('Falha ao iniciar. Tente novamente.');
      }
    }, 30000);
    
    return () => clearTimeout(timeoutRef.current);
  }, [enabled, jobId, toolType, onJobFailed]);
}
```

---

## Resumo: Por Que Esta Solução É Segura

1. **Não mexe na lógica de fila** - Apenas adiciona proteção para pending órfãos
2. **Verificação tripla** - status + task_id + idade antes de agir
3. **Idempotente** - Rodar múltiplas vezes não causa problemas
4. **Backward compatible** - Jobs normais não são afetados
5. **Defense in depth** - 3 camadas: frontend (30s), server (30s), cleanup (10m)

