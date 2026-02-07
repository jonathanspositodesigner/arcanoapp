/**
 * useJobPendingWatchdog - Detecta e corrige jobs travados como 'pending'
 * 
 * Se um job fica 'pending' por mais de 30 segundos, algo deu errado na
 * chamada à Edge Function. Este watchdog marca o job como 'failed' via RPC
 * e notifica o usuário imediatamente.
 * 
 * IMPORTANTE: Jobs 'pending' nunca cobram créditos, então não há reembolso.
 * Isso é uma rede de segurança para evitar que usuários fiquem presos esperando.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ToolType, queryJobStatus } from '@/ai/JobManager';

const PENDING_TIMEOUT_MS = 30000; // 30 segundos

// Mapeamento de ToolType para nome da tabela no banco
const TABLE_NAME_MAP: Record<ToolType, string> = {
  upscaler: 'upscaler_jobs',
  pose_changer: 'pose_changer_jobs',
  veste_ai: 'veste_ai_jobs',
  video_upscaler: 'video_upscaler_jobs',
};

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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTriggeredRef = useRef(false);
  const currentJobIdRef = useRef<string | null>(null);

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

    // Só ativar para jobs pending
    if (!jobId || status !== 'pending') {
      // Limpar timeout se status mudou (job iniciou normalmente)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Já disparou para este job, não repetir
    if (hasTriggeredRef.current) return;

    console.log(`[PendingWatchdog] Starting 30s timer for job ${jobId} (${toolType})`);

    timeoutRef.current = setTimeout(async () => {
      if (hasTriggeredRef.current) return;
      hasTriggeredRef.current = true;

      console.log(`[PendingWatchdog] 30s elapsed, checking job ${jobId}`);

      // Verificar status atual no banco (pode ter mudado)
      const currentJob = await queryJobStatus(toolType, jobId);
      
      if (!currentJob || currentJob.status !== 'pending') {
        console.log(`[PendingWatchdog] Job already transitioned to ${currentJob?.status}, skipping`);
        return;
      }

      // Ainda pending após 30s = problema confirmado
      console.warn(`[PendingWatchdog] Job ${jobId} stuck as pending for 30s, marking as failed`);

      const tableName = TABLE_NAME_MAP[toolType];
      
      try {
        const { data, error } = await supabase.rpc('mark_pending_job_as_failed', {
          p_table_name: tableName,
          p_job_id: jobId,
          p_error_message: 'Falha ao iniciar processamento. A conexão com o servidor falhou.',
        });

        if (error) {
          console.error('[PendingWatchdog] RPC error:', error);
        } else {
          console.log('[PendingWatchdog] Job marked as failed via RPC:', data);
        }
      } catch (rpcError) {
        console.error('[PendingWatchdog] RPC exception:', rpcError);
      }

      // Notificar UI independente do resultado da RPC (para liberar o usuário)
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
