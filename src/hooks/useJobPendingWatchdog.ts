/**
 * useJobPendingWatchdog v3 - Detecta e corrige jobs travados como 'pending'
 * 
 * CORREÇÕES v3:
 * 1. NÃO desativa quando UI status é 'error' - mantém ativo enquanto jobId existir
 *    (o catch do frontend já marca o job como failed, mas se falhar, o watchdog pega)
 * 2. Verifica step_history e current_step antes de marcar como órfão
 *    (evita matar jobs que já estão progredindo internamente)
 * 3. Jobs com step_history recebem janela maior (reconciliação híbrida)
 */
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ToolType } from '@/ai/JobManager';

// Timeout para jobs sem nenhum progresso (verdadeiramente órfãos)
const ORPHAN_TIMEOUT_MS = 240000; // 240s (increased for RunningHub queue delays)

// Timeout para jobs COM progresso mas travados (reconciliação)
const STALLED_TIMEOUT_MS = 360000; // 6 min

// Mapeamento de ToolType para nome da tabela no banco
const TABLE_NAME_MAP: Record<ToolType, string> = {
  upscaler: 'upscaler_jobs',
  pose_changer: 'pose_changer_jobs',
  veste_ai: 'veste_ai_jobs',
  video_upscaler: 'video_upscaler_jobs',
  arcano_cloner: 'arcano_cloner_jobs',
  character_generator: 'character_generator_jobs',
  flyer_maker: 'flyer_maker_jobs',
  bg_remover: 'bg_remover_jobs',
  image_generator: 'image_generator_jobs',
};

interface UseJobPendingWatchdogOptions {
  jobId: string | null;
  toolType: ToolType;
  /**
   * Ativa o watchdog quando há job ativo.
   * IMPORTANTE: NÃO desativar quando status === 'error' na UI!
   * Usar: enabled = !!jobId && status !== 'idle' && status !== 'completed'
   */
  enabled: boolean;
  onJobFailed: (errorMessage: string) => void;
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

  const stableOnJobFailed = useCallback(onJobFailed, [onJobFailed]);

  useEffect(() => {
    // Se o jobId mudou, resetar o estado
    if (jobId !== currentJobIdRef.current) {
      currentJobIdRef.current = jobId;
      hasTriggeredRef.current = false;
      
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
    
    console.log(`[PendingWatchdog] Starting timer for job ${jobId} (${toolType})`);

    // Primeiro check: após ORPHAN_TIMEOUT_MS
    timeoutRef.current = setTimeout(async () => {
      if (hasTriggeredRef.current) return;

      console.log(`[PendingWatchdog] Checking job ${jobId} in database...`);

      try {
        const { data: job, error } = await supabase
          .from(tableName as 'upscaler_jobs')
          .select('status, task_id, created_at, current_step, step_history')
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

        // Se o job já transitou para um estado terminal ou ativo, sair
        if (job.status === 'completed' || job.status === 'failed' || job.status === 'running') {
          console.log(`[PendingWatchdog] Job already at '${job.status}', skipping`);
          return;
        }

        // Se tem task_id, o provedor já aceitou - não é órfão
        if (job.task_id) {
          console.log(`[PendingWatchdog] Job has task_id=${job.task_id}, not orphan`);
          return;
        }

        const createdAt = new Date(job.created_at).getTime();
        const age = Date.now() - createdAt;

        // Verificar se tem sinais de progresso
        const stepHistory = (job as any).step_history;
        const currentStep = (job as any).current_step;
        const hasProgress = (
          (stepHistory && Array.isArray(stepHistory) && stepHistory.length > 0) ||
          (currentStep && currentStep !== 'pending' && currentStep !== null)
        );

        if (hasProgress) {
          // Job tem progresso mas está travado - dar mais tempo (reconciliação)
          if (age < STALLED_TIMEOUT_MS) {
            console.log(`[PendingWatchdog] Job ${jobId} has progress (step=${currentStep}, history=${stepHistory?.length || 0}), waiting longer (age=${age}ms < ${STALLED_TIMEOUT_MS}ms)`);
            
            // Agendar segundo check para STALLED_TIMEOUT
            const remainingTime = STALLED_TIMEOUT_MS - age;
            timeoutRef.current = setTimeout(async () => {
              if (hasTriggeredRef.current) return;
              
              // Re-check no banco
              const { data: recheckJob } = await supabase
                .from(tableName as 'upscaler_jobs')
                .select('status, task_id')
                .eq('id', jobId)
                .maybeSingle();
              
              if (!recheckJob || recheckJob.status === 'completed' || recheckJob.status === 'failed' || recheckJob.status === 'running' || recheckJob.task_id) {
                console.log(`[PendingWatchdog] Job ${jobId} resolved after extended wait`);
                return;
              }
              
              // Ainda travado após janela estendida
              hasTriggeredRef.current = true;
              console.warn(`[PendingWatchdog] Job ${jobId} stalled WITH progress after ${STALLED_TIMEOUT_MS}ms, marking as failed`);
              
              await supabase.rpc('mark_pending_job_as_failed', {
                p_table_name: tableName,
                p_job_id: jobId,
                p_error_message: 'Processamento travado. O servidor parou de responder.',
              });
              
              stableOnJobFailed('Processamento travado. Tente novamente.');
            }, remainingTime);
            
            return;
          }
        }

        // Job sem progresso E acima do timeout - verdadeiro órfão
        if (age < ORPHAN_TIMEOUT_MS) {
          console.log(`[PendingWatchdog] Job age is only ${age}ms, not old enough, skipping`);
          return;
        }

        hasTriggeredRef.current = true;
        console.warn(`[PendingWatchdog] Job ${jobId} confirmed as orphan (age=${age}ms, task_id=null, no progress), marking as failed`);

        const { error: rpcError } = await supabase.rpc('mark_pending_job_as_failed', {
          p_table_name: tableName,
          p_job_id: jobId,
          p_error_message: 'Falha ao iniciar processamento. A conexão com o servidor falhou.',
        });

        if (rpcError) {
          console.error('[PendingWatchdog] RPC error:', rpcError);
        }

        stableOnJobFailed('Falha ao iniciar processamento. Tente novamente.');

      } catch (e) {
        console.error('[PendingWatchdog] Exception during check:', e);
      }
    }, ORPHAN_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [jobId, enabled, toolType, stableOnJobFailed]);
}
