/**
 * useJobPendingWatchdog v2 - Detecta e corrige jobs travados como 'pending'
 * 
 * Se um job fica 'pending' por mais de 30 segundos SEM iniciar (task_id = null),
 * algo deu errado na chamada à Edge Function. Este watchdog marca o job como 
 * 'failed' via RPC e notifica o usuário imediatamente.
 * 
 * IMPORTANTE: Jobs 'pending' nunca cobram créditos, então não há reembolso.
 * Isso é uma rede de segurança para evitar que usuários fiquem presos esperando.
 * 
 * CORREÇÃO v2: Não depende mais do status da UI (que nunca é 'pending').
 * Agora usa flag 'enabled' e faz verificação tripla no banco antes de agir:
 * - status === 'pending'
 * - task_id IS NULL
 * - idade > 30 segundos
 */
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ToolType } from '@/ai/JobManager';

const PENDING_TIMEOUT_MS = 30000; // 30 segundos

// Mapeamento de ToolType para nome da tabela no banco
const TABLE_NAME_MAP: Record<ToolType, string> = {
  upscaler: 'upscaler_jobs',
  pose_changer: 'pose_changer_jobs',
  veste_ai: 'veste_ai_jobs',
  video_upscaler: 'video_upscaler_jobs',
  arcano_cloner: 'arcano_cloner_jobs',
  character_generator: 'character_generator_jobs',
  flyer_maker: 'flyer_maker_jobs',
};

interface UseJobPendingWatchdogOptions {
  jobId: string | null;
  toolType: ToolType;
  /**
   * Ativa o watchdog quando o job está em processo de inicialização.
   * Recomendado: enabled = status !== 'idle' && status !== 'completed' && status !== 'error'
   */
  enabled: boolean;
  onJobFailed: (errorMessage: string) => void;
}

interface JobDbStatus {
  status: string;
  task_id: string | null;
  created_at: string;
}

export function useJobPendingWatchdog({
  jobId,
  toolType,
  enabled,
  onJobFailed,
}: UseJobPendingWatchdogOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTriggeredRef = useRef(false);
  const currentJobIdRef = useRef<string | null>(null);

  // Estabilizar callback para evitar re-renders desnecessários
  const stableOnJobFailed = useCallback(onJobFailed, [onJobFailed]);

  useEffect(() => {
    // Se o jobId mudou, resetar o estado
    if (jobId !== currentJobIdRef.current) {
      currentJobIdRef.current = jobId;
      hasTriggeredRef.current = false;
      
      // Limpar timeout anterior se existir
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    // Se não está habilitado ou não tem jobId, limpar e sair
    if (!enabled || !jobId) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Já disparou para este job, não repetir
    if (hasTriggeredRef.current) return;

    const tableName = TABLE_NAME_MAP[toolType];
    
    console.log(`[PendingWatchdog] Starting 30s timer for job ${jobId} (${toolType})`);

    timeoutRef.current = setTimeout(async () => {
      if (hasTriggeredRef.current) return;

      console.log(`[PendingWatchdog] 30s elapsed, checking job ${jobId} in database...`);

      try {
        // VERIFICAÇÃO TRIPLA no banco de dados (não depende da UI)
        // Usar type assertion para contornar limitação do TypeScript com tabelas dinâmicas
        const { data: job, error } = await supabase
          .from(tableName as 'upscaler_jobs')
          .select('status, task_id, created_at')
          .eq('id', jobId)
          .maybeSingle();

        if (error) {
          console.error('[PendingWatchdog] Database query error:', error);
          return;
        }

        if (!job) {
          console.log(`[PendingWatchdog] Job ${jobId} not found in database, skipping`);
          return;
        }

        // Verificação 1: Status ainda é 'pending'?
        if (job.status !== 'pending') {
          console.log(`[PendingWatchdog] Job already transitioned to '${job.status}', skipping`);
          return;
        }

        // Verificação 2: task_id ainda é null? (significa que nunca iniciou no RunningHub)
        if (job.task_id) {
          console.log(`[PendingWatchdog] Job has task_id=${job.task_id}, already started, skipping`);
          return;
        }

        // Verificação 3: Job tem mais de 30 segundos?
        const createdAt = new Date(job.created_at).getTime();
        const age = Date.now() - createdAt;
        if (age < PENDING_TIMEOUT_MS) {
          console.log(`[PendingWatchdog] Job age is only ${age}ms, not old enough, skipping`);
          return;
        }

        // TODAS AS VERIFICAÇÕES PASSARAM: Job órfão confirmado!
        hasTriggeredRef.current = true;
        console.warn(`[PendingWatchdog] Job ${jobId} confirmed as orphan pending (age=${age}ms, task_id=null), marking as failed`);

        // Marcar como failed via RPC
        const { data: rpcResult, error: rpcError } = await supabase.rpc('mark_pending_job_as_failed', {
          p_table_name: tableName,
          p_job_id: jobId,
          p_error_message: 'Falha ao iniciar processamento. A conexão com o servidor falhou.',
        });

        if (rpcError) {
          console.error('[PendingWatchdog] RPC error:', rpcError);
        } else {
          console.log('[PendingWatchdog] Job marked as failed via RPC:', rpcResult);
        }

        // Notificar UI (para liberar o usuário) independente do resultado da RPC
        stableOnJobFailed('Falha ao iniciar processamento. Tente novamente.');

      } catch (e) {
        console.error('[PendingWatchdog] Exception during check:', e);
      }
    }, PENDING_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [jobId, enabled, toolType, stableOnJobFailed]);
}
