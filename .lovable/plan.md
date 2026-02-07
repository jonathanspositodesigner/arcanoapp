
# Plano: Watchdog de 30 Segundos para Jobs Pending

## Problema Identificado

O job ficou travado como `pending` porque:
1. Job criado no banco ✅ (linha 525-536)
2. Chamada à Edge Function falhou (linha 551-576)
3. Job ficou órfão - nunca foi iniciado
4. O cleanup do banco só roda a cada 10 minutos e não incluía `pending`

## Solução: Watchdog de 30 Segundos no Frontend

### Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    WATCHDOG DE 30 SEGUNDOS PARA PENDING                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  FLUXO NORMAL:                                                          │
│  1. [Job criado] → status: 'pending'                                    │
│  2. [Edge Function chamada] → status: 'starting/queued/running'         │
│  3. [Job processa] → status: 'completed' ou 'failed'                    │
│                                                                         │
│  FLUXO COM FALHA (ATUAL - SEM PROTEÇÃO):                               │
│  1. [Job criado] → status: 'pending'                                    │
│  2. [Edge Function FALHA] → status continua 'pending' PARA SEMPRE       │
│  ❌ Usuário fica preso esperando eternamente                            │
│                                                                         │
│  FLUXO COM FALHA (NOVO - COM WATCHDOG):                                │
│  1. [Job criado] → status: 'pending' + Timer de 30s inicia              │
│  2. [Edge Function FALHA] → status continua 'pending'                   │
│  3. [30 segundos depois] → Watchdog detecta                             │
│  4. [Watchdog] → Marca job como 'failed' via RPC                        │
│  5. [UI] → Mostra erro pro usuário imediatamente                        │
│  ✅ Usuário pode tentar novamente                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| **Migration SQL** | CRIAR | Incluir `pending` no cleanup + criar RPC para marcar como failed |
| `src/hooks/useJobPendingWatchdog.ts` | CRIAR | Watchdog centralizado de 30s |
| `src/pages/UpscalerArcanoTool.tsx` | MODIFICAR | Integrar watchdog |
| `src/pages/PoseChangerTool.tsx` | MODIFICAR | Integrar watchdog |
| `src/pages/VesteAITool.tsx` | MODIFICAR | Integrar watchdog |
| `src/pages/VideoUpscalerTool.tsx` | MODIFICAR | Integrar watchdog |

---

## Parte 1: Migration SQL

### 1.1 Incluir `pending` no cleanup automático

Adicionar `'pending'` à lista de status que são limpos após 10 minutos (backup de segurança):

```sql
WHERE status IN ('running', 'queued', 'starting', 'pending')
```

### 1.2 Criar RPC para marcar job como failed (usada pelo frontend)

```sql
CREATE OR REPLACE FUNCTION public.mark_pending_job_as_failed(
  p_table_name text, 
  p_job_id uuid,
  p_error_message text DEFAULT 'Timeout de inicialização - Edge Function não respondeu'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_status TEXT;
  v_auth_user_id UUID;
BEGIN
  v_auth_user_id := auth.uid();
  
  -- Verificar autenticação
  IF v_auth_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Buscar job atual
  IF p_table_name = 'upscaler_jobs' THEN
    SELECT user_id, status INTO v_user_id, v_current_status
    FROM upscaler_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'pose_changer_jobs' THEN
    SELECT user_id, status INTO v_user_id, v_current_status
    FROM pose_changer_jobs WHERE id = p_job_id;
  -- ... demais tabelas
  END IF;

  -- Verificar dono e status pending
  IF v_user_id != v_auth_user_id OR v_current_status != 'pending' THEN
    RETURN FALSE;
  END IF;

  -- Marcar como failed (sem reembolso pois pending nunca cobrou créditos)
  IF p_table_name = 'upscaler_jobs' THEN
    UPDATE upscaler_jobs SET 
      status = 'failed',
      error_message = p_error_message,
      completed_at = NOW()
    WHERE id = p_job_id;
  -- ... demais tabelas
  END IF;

  RETURN TRUE;
END;
$$;
```

---

## Parte 2: Hook useJobPendingWatchdog

### Características

- **Timeout de 30 segundos** para jobs `pending`
- **Verificação dupla**: Consulta banco antes de marcar como failed (para não matar job que já iniciou)
- **Notificação ao usuário** via callback
- **Cleanup automático** quando componente desmonta

### Código

```typescript
/**
 * useJobPendingWatchdog - Detecta e corrige jobs travados como 'pending'
 * 
 * Se um job fica 'pending' por mais de 30 segundos, algo deu errado na
 * chamada à Edge Function. Este watchdog marca o job como 'failed' via RPC
 * e notifica o usuário imediatamente.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ToolType, TABLE_MAP, queryJobStatus } from '@/ai/JobManager';

const PENDING_TIMEOUT_MS = 30000; // 30 segundos

interface UseJobPendingWatchdogOptions {
  jobId: string | null;
  status: string;
  toolType: ToolType;
  onJobFailed: (errorMessage: string) => void;
}

export function useJobPendingWatchdog({
  jobId,
  status,
  toolType,
  onJobFailed,
}: UseJobPendingWatchdogOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    // Só ativar para jobs pending
    if (!jobId || status !== 'pending') {
      // Limpar timeout se status mudou
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      hasTriggeredRef.current = false;
      return;
    }

    // Já disparou para este job, não repetir
    if (hasTriggeredRef.current) return;

    console.log(`[PendingWatchdog] Starting 30s timer for job ${jobId}`);

    timeoutRef.current = setTimeout(async () => {
      if (hasTriggeredRef.current) return;
      hasTriggeredRef.current = true;

      console.log(`[PendingWatchdog] 30s elapsed, checking job ${jobId}`);

      // Verificar status atual no banco (pode ter mudado)
      const currentJob = await queryJobStatus(toolType, jobId);
      
      if (!currentJob || currentJob.status !== 'pending') {
        console.log(`[PendingWatchdog] Job already transitioned to ${currentJob?.status}`);
        return;
      }

      // Ainda pending após 30s = problema confirmado
      console.warn(`[PendingWatchdog] Job stuck as pending, marking as failed`);

      const tableName = TABLE_MAP[toolType];
      const { data, error } = await supabase.rpc('mark_pending_job_as_failed', {
        p_table_name: tableName,
        p_job_id: jobId,
        p_error_message: 'Falha ao iniciar processamento. A conexão com o servidor falhou. Tente novamente.',
      });

      if (error) {
        console.error('[PendingWatchdog] RPC error:', error);
      }

      // Notificar UI independente do resultado da RPC
      onJobFailed('Falha ao iniciar processamento. Tente novamente.');
    }, PENDING_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [jobId, status, toolType, onJobFailed]);
}
```

---

## Parte 3: Integração nas Ferramentas

### Exemplo no UpscalerArcanoTool.tsx

```typescript
import { useJobPendingWatchdog } from '@/hooks/useJobPendingWatchdog';

// Dentro do componente:
useJobPendingWatchdog({
  jobId,
  status,
  toolType: 'upscaler',
  onJobFailed: useCallback((errorMessage) => {
    setStatus('error');
    setLastError({
      message: errorMessage,
      code: 'INIT_TIMEOUT',
      solution: 'Verifique sua conexão e tente novamente.',
    });
    toast.error(errorMessage);
    endSubmit(); // Liberar botão
  }, [endSubmit]),
});
```

### Replicar nas outras ferramentas

Mesmo padrão para:
- `PoseChangerTool.tsx` → `toolType: 'pose'`
- `VesteAITool.tsx` → `toolType: 'veste'`
- `VideoUpscalerTool.tsx` → `toolType: 'video'`

---

## Parte 4: Corrigir Job Atual

Query para corrigir o job travado agora:

```sql
UPDATE upscaler_jobs 
SET 
  status = 'failed',
  error_message = 'Job travado como pending - corrigido manualmente',
  completed_at = NOW()
WHERE id = 'fcba40e4-bcf9-4019-bd12-69d9aa98cee4';
```

---

## Resumo da Proteção em Camadas

| Camada | Tempo | Ação | Responsável |
|--------|-------|------|-------------|
| **1. Watchdog Frontend** | 30 segundos | Marca como `failed` + notifica usuário | Hook no React |
| **2. Cleanup Banco** | 10 minutos | Backup - limpa jobs órfãos + reembolsa | RPC periódica |

---

## Resultado Final

| Cenário | Antes | Depois |
|---------|-------|--------|
| Edge Function falha | Job fica `pending` para sempre | Usuário vê erro em 30s |
| Usuário perde conexão | Job fica `pending` para sempre | Cleanup em 10min (backup) |
| Edge Function demora | Funciona normal | Funciona normal |
| Job processa com sucesso | Funciona normal | Funciona normal |

---

## Ordem de Execução

1. **Migration SQL** - RPC `mark_pending_job_as_failed` + incluir `pending` no cleanup
2. **Query direta** - Corrigir o job travado atual
3. **useJobPendingWatchdog** - Criar hook de watchdog de 30s
4. **UpscalerArcanoTool** - Integrar watchdog
5. **PoseChangerTool** - Integrar watchdog
6. **VesteAITool** - Integrar watchdog
7. **VideoUpscalerTool** - Integrar watchdog
