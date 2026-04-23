/**
 * useJobStatusSync - Sistema de Sincronização Tripla para Jobs de IA
 * 
 * Este hook garante que o usuário SEMPRE receba o status final do job,
 * independente de problemas de rede, WebSocket ou dispositivo em standby.
 * 
 * ARQUITETURA:
 * 1. REALTIME (primário): Supabase Realtime para updates instantâneos
 * 2. POLLING SILENCIOSO (backup): Consulta direta ao banco a cada 5s após delay inicial
 * 3. VISIBILITY RECOVERY: Quando usuário volta à aba, verifica imediatamente
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ToolType, JobStatus, JobUpdate, TABLE_MAP, queryJobStatus } from '@/ai/JobManager';

// Timeouts diferenciados por tipo de ferramenta
const VIDEO_TOOLS: ToolType[] = ['video_generator', 'movieled_maker'];
const TIMEOUT_DEFAULT_MS = 600000;  // 10 min para ferramentas padrão
const TIMEOUT_VIDEO_MS = 900000;    // 15 min para vídeo (Veo pode demorar)

function getTimeoutForTool(toolType: ToolType): number {
  return VIDEO_TOOLS.includes(toolType) ? TIMEOUT_VIDEO_MS : TIMEOUT_DEFAULT_MS;
}

// Configurações do polling de backup
const POLLING_CONFIG = {
  INITIAL_DELAY_MS: 5000,   // 5s - verificar mais cedo
  INTERVAL_MS: 5000,        // 5s entre polls
} as const;

interface UseJobStatusSyncOptions {
  /** ID do job ativo (null quando não há job) */
  jobId: string | null;
  /** Tipo da ferramenta (para mapear tabela correta) */
  toolType: ToolType;
  /** Se a sincronização deve estar ativa */
  enabled: boolean;
  /** Callback chamado quando status muda */
  onStatusChange: (update: JobUpdate) => void;
  /** Callback opcional para notificar mudança de status ao contexto global */
  onGlobalStatusChange?: (status: JobStatus) => void;
}

interface UseJobStatusSyncResult {
  /** Força cleanup manual (normalmente não precisa chamar) */
  cleanup: () => void;
}

export function useJobStatusSync({
  jobId,
  toolType,
  enabled,
  onStatusChange,
  onGlobalStatusChange,
}: UseJobStatusSyncOptions): UseJobStatusSyncResult {
  const tableName = TABLE_MAP[toolType];
  
  // === REFS ESTÁVEIS para callbacks (evitam re-render do useEffect) ===
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;
  
  const onGlobalStatusChangeRef = useRef(onGlobalStatusChange);
  onGlobalStatusChangeRef.current = onGlobalStatusChange;
  
  // Refs para controle de estado interno
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingStartTimeRef = useRef<number | null>(null);
  const absoluteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKnownStatusRef = useRef<JobStatus | null>(null);
  const isCompletedRef = useRef(false);
  
  // Cleanup ref-based (para expor no return)
  const cleanupRef = useRef(() => {});
  
  // Effect principal - configura sincronização tripla
  // Dependências ESTÁVEIS: enabled, jobId, toolType, tableName
  useEffect(() => {
    // === Funções internas (capturam refs, não dependem de callbacks instáveis) ===
    
    const processUpdate = async (data: any, source: 'realtime' | 'polling' | 'visibility') => {
      const status = data.status as JobStatus;
      
      if (status === lastKnownStatusRef.current) {
        console.log(`[JobSync] ${source}: Status unchanged (${status}), skipping`);
        return;
      }
      
      console.log(`[JobSync] ${source}: Status changed ${lastKnownStatusRef.current} -> ${status}`);
      lastKnownStatusRef.current = status;
      
      // Notificar contexto global (para som de notificação)
      onGlobalStatusChangeRef.current?.(status);
      
      let update: JobUpdate = {
        status,
        outputUrl: data.output_url,
        thumbnailUrl: data.thumbnail_url,
        errorMessage: data.error_message,
        position: data.position,
        currentStep: data.current_step,
      };
      
      // FALLBACK: Se completou mas output_url veio null no realtime, buscar do banco
      if (status === 'completed' && !data.output_url && jobId) {
        console.log(`[JobSync] ${source}: completed without output_url, fetching from DB...`);
        try {
          const dbUpdate = await queryJobStatus(toolType, jobId);
          if (dbUpdate?.outputUrl) {
            console.log(`[JobSync] DB fallback found output_url`);
            update = { ...update, outputUrl: dbUpdate.outputUrl, thumbnailUrl: dbUpdate.thumbnailUrl };
          } else {
            // Retry once after 2s - output_url might not be written yet
            await new Promise(r => setTimeout(r, 2000));
            const retryUpdate = await queryJobStatus(toolType, jobId);
            if (retryUpdate?.outputUrl) {
              console.log(`[JobSync] DB fallback retry found output_url`);
              update = { ...update, outputUrl: retryUpdate.outputUrl, thumbnailUrl: retryUpdate.thumbnailUrl };
            }
          }
        } catch (e) {
          console.error('[JobSync] DB fallback failed:', e);
        }
      }
      
      if (['completed', 'failed', 'cancelled'].includes(status)) {
        isCompletedRef.current = true;
        if (absoluteTimeoutRef.current) {
          clearTimeout(absoluteTimeoutRef.current);
          absoluteTimeoutRef.current = null;
        }
      }
      
      onStatusChangeRef.current(update);
    };
    
    const pollJobStatus = async () => {
      if (!jobId || isCompletedRef.current) return;
      
      if (pollingStartTimeRef.current) {
        const elapsed = Date.now() - pollingStartTimeRef.current;
        if (elapsed >= getTimeoutForTool(toolType)) {
          console.log('[JobSync] Polling timeout reached, stopping');
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          return;
        }
      }
      
      console.log(`[JobSync] Polling ${tableName} for job ${jobId}`);
      
      try {
        const update = await queryJobStatus(toolType, jobId);
        if (update) {
          processUpdate({
            status: update.status,
            output_url: update.outputUrl,
            thumbnail_url: update.thumbnailUrl,
            error_message: update.errorMessage,
            position: update.position,
          }, 'polling');
        }
      } catch (error) {
        console.error('[JobSync] Polling error:', error);
      }
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isCompletedRef.current) {
        console.log('[JobSync] Tab became visible, checking status');
        pollJobStatus();
      }
    };
    
    const doCleanup = () => {
      console.log('[JobSync] Cleaning up');
      
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      if (absoluteTimeoutRef.current) {
        clearTimeout(absoluteTimeoutRef.current);
        absoluteTimeoutRef.current = null;
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      pollingStartTimeRef.current = null;
      lastKnownStatusRef.current = null;
      isCompletedRef.current = false;
    };
    
    // Atualizar ref de cleanup para acesso externo
    cleanupRef.current = doCleanup;
    
    if (!enabled || !jobId) {
      doCleanup();
      return;
    }
    
    console.log(`[JobSync] Setting up triple sync for ${toolType} job ${jobId}`);
    isCompletedRef.current = false;
    lastKnownStatusRef.current = null;
    
    // CLEANUP OPORTUNÍSTICO: dispara limpeza server-side de jobs presos
    fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/runninghub-queue-manager/check`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({}),
      }
    ).catch(e => console.error('[JobSync] Cleanup trigger failed:', e));
    
    // 1. REALTIME SUBSCRIPTION
    const channel = supabase
      .channel(`job-sync-${toolType}-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: tableName,
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          if (isCompletedRef.current) return;
          processUpdate(payload.new, 'realtime');
        }
      )
      .subscribe((status) => {
        console.log(`[JobSync] Realtime subscription: ${status}`);
      });
    
    realtimeChannelRef.current = channel;
    
    // 2. POLLING SILENCIOSO (backup)
    const pollingDelayTimeout = setTimeout(() => {
      if (isCompletedRef.current) return;
      
      pollingStartTimeRef.current = Date.now();
      console.log('[JobSync] Starting backup polling');
      
      pollJobStatus();
      
      pollingIntervalRef.current = setInterval(() => {
        if (isCompletedRef.current) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          return;
        }
        pollJobStatus();
      }, POLLING_CONFIG.INTERVAL_MS);
    }, POLLING_CONFIG.INITIAL_DELAY_MS);
    
    // 3. VISIBILITY RECOVERY
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 4. TIMER ABSOLUTO (diferenciado por ferramenta)
    const timeoutMs = getTimeoutForTool(toolType);
    const timeoutMinutes = Math.round(timeoutMs / 60000);
    absoluteTimeoutRef.current = setTimeout(async () => {
      if (isCompletedRef.current) return;
      
      console.log(`[JobSync] ⚠️ ABSOLUTE TIMEOUT (${timeoutMinutes} min) reached! Forcing final check...`);
      
      // 4a. Check DB status first
      try {
        const update = await queryJobStatus(toolType, jobId);
        if (update && ['completed', 'failed', 'cancelled'].includes(update.status)) {
          console.log(`[JobSync] Final check found terminal status: ${update.status}`);
          processUpdate({
            status: update.status,
            output_url: update.outputUrl,
            error_message: update.errorMessage,
            position: update.position,
          }, 'polling');
          return;
        }
      } catch (error) {
        console.error('[JobSync] Final check error:', error);
      }
      
      // 4b. Try provider-specific reconciliation before killing
      try {
        // Check if this is an Evolink job based on tool type
        const isEvolinkCandidate = ['video_generator', 'movieled_maker'].includes(toolType);
        let isEvolinkJob = false;
        
        if (isEvolinkCandidate) {
          try {
            // Use specific table query to avoid TS union type issues
            const targetTable = toolType === 'video_generator' ? 'video_generator_jobs' : 'movieled_maker_jobs';
            const { data: jobData } = await supabase
              .from(targetTable as 'video_generator_jobs')
              .select('api_account, task_id')
              .eq('id', jobId)
              .maybeSingle();
            isEvolinkJob = jobData?.api_account === 'evolink' && !!jobData?.task_id;
          } catch { /* ignore */ }
        }

        if (isEvolinkJob) {
          // EVOLINK RECONCILIATION: Call poll-evolink directly
          console.log('[JobSync] Attempting Evolink reconciliation before timeout...');
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          if (token) {
            const functionName = toolType === 'movieled_maker' ? 'runninghub-movieled-maker' : 'generate-video';
            const pollResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}/poll-evolink`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                  'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                },
                body: JSON.stringify({ job_id: jobId }),
              }
            );
            const pollResult = await pollResponse.json();
            console.log('[JobSync] Evolink reconciliation result:', pollResult);

            if (pollResult.status === 'completed' || pollResult.status === 'failed') {
              await new Promise(resolve => setTimeout(resolve, 1500));
              const finalUpdate = await queryJobStatus(toolType, jobId);
              if (finalUpdate && ['completed', 'failed', 'cancelled'].includes(finalUpdate.status)) {
                processUpdate({
                  status: finalUpdate.status,
                  output_url: finalUpdate.outputUrl,
                  error_message: finalUpdate.errorMessage,
                  position: finalUpdate.position,
                }, 'polling');
                return;
              }
            } else if (pollResult.status === 'processing' || pollResult.progress > 0) {
              // Evolink still processing - extend timeout
              console.log('[JobSync] Evolink confirms still processing, extending wait...');
              const extendMs = 300000;
              absoluteTimeoutRef.current = setTimeout(() => {
                console.log('[JobSync] Extended timeout expired, forcing failure');
                isCompletedRef.current = true;
                onGlobalStatusChangeRef.current?.('failed');
                onStatusChangeRef.current({
                  status: 'failed',
                  errorMessage: `Tempo limite estendido excedido. Seus créditos serão estornados automaticamente.`,
                });
                doCleanup();
              }, extendMs);
              return;
            }
          }
        } else {
          // RUNNINGHUB RECONCILIATION (original logic)
          console.log('[JobSync] Attempting RunningHub reconciliation before timeout...');
          const reconcileResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/runninghub-queue-manager/reconcile`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({ table: tableName, jobId }),
            }
          );
          const reconcileResult = await reconcileResponse.json();
          console.log('[JobSync] Reconciliation result:', reconcileResult);
          
          if (reconcileResult.resolved) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const finalUpdate = await queryJobStatus(toolType, jobId);
            if (finalUpdate && ['completed', 'failed', 'cancelled'].includes(finalUpdate.status)) {
              processUpdate({
                status: finalUpdate.status,
                output_url: finalUpdate.outputUrl,
                error_message: finalUpdate.errorMessage,
                position: finalUpdate.position,
              }, 'polling');
              return;
            }
          } else if (reconcileResult.reason === 'still_running') {
            console.log('[JobSync] Provider confirms task still running, extending wait...');
            const extendMs = 300000;
            absoluteTimeoutRef.current = setTimeout(() => {
              console.log('[JobSync] Extended timeout expired, forcing failure');
              isCompletedRef.current = true;
              onGlobalStatusChangeRef.current?.('failed');
              onStatusChangeRef.current({
                status: 'failed',
                errorMessage: `Tempo limite estendido excedido. Seus créditos serão estornados automaticamente.`,
              });
              doCleanup();
            }, extendMs);
            return;
          }
        }
      } catch (reconcileError) {
        console.error('[JobSync] Reconciliation failed:', reconcileError);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (isCompletedRef.current) return;
      
      // GUARD: Before forcing failure, check if webhook was already received
      // If so, the backend fallback will handle completion — don't interfere
      try {
        const guardUpdate = await queryJobStatus(toolType, jobId);
        if (guardUpdate) {
          if (['completed', 'failed', 'cancelled'].includes(guardUpdate.status)) {
            console.log(`[JobSync] Guard check: job already terminal (${guardUpdate.status})`);
            processUpdate({
              status: guardUpdate.status,
              output_url: guardUpdate.outputUrl,
              error_message: guardUpdate.errorMessage,
              position: guardUpdate.position,
            }, 'polling');
            return;
          }
          if (guardUpdate.currentStep === 'webhook_received') {
            console.log('[JobSync] Guard check: webhook_received detected, extending wait 60s...');
            absoluteTimeoutRef.current = setTimeout(async () => {
              if (isCompletedRef.current) return;
              const finalCheck = await queryJobStatus(toolType, jobId);
              if (finalCheck && ['completed', 'failed', 'cancelled'].includes(finalCheck.status)) {
                processUpdate({
                  status: finalCheck.status,
                  output_url: finalCheck.outputUrl,
                  error_message: finalCheck.errorMessage,
                  position: finalCheck.position,
                }, 'polling');
              } else {
                isCompletedRef.current = true;
                onGlobalStatusChangeRef.current?.('failed');
                onStatusChangeRef.current({
                  status: 'failed',
                  errorMessage: `Tempo limite de processamento excedido. Seus créditos serão estornados automaticamente.`,
                });
                doCleanup();
              }
            }, 60000);
            return;
          }
        }
      } catch (guardError) {
        console.error('[JobSync] Guard check failed:', guardError);
      }
      
      console.log(`[JobSync] ❌ Job still active after ${timeoutMinutes} min, forcing server-side cancellation`);
      isCompletedRef.current = true;
      
      try {
        const finishResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/runninghub-queue-manager/finish`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              table: tableName,
              jobId,
              status: 'failed',
              errorMessage: `Timeout: job excedeu ${timeoutMinutes} minutos sem resposta do provedor`,
            }),
          }
        );
        console.log(`[JobSync] Server-side cancellation response: ${finishResponse.status}`);
      } catch (e) {
        console.error('[JobSync] Failed to cancel job server-side:', e);
      }
      
      onGlobalStatusChangeRef.current?.('failed');
      
      onStatusChangeRef.current({
        status: 'failed',
        errorMessage: `Tempo limite de processamento excedido (${timeoutMinutes} min). Seus créditos serão estornados automaticamente.`,
      });
      
      doCleanup();
    }, timeoutMs);
    
    // Cleanup on unmount/deps change
    return () => {
      clearTimeout(pollingDelayTimeout);
      doCleanup();
    };
  }, [enabled, jobId, toolType, tableName]); // ← Apenas dependências ESTÁVEIS
  
  return { cleanup: () => cleanupRef.current() };
}

export default useJobStatusSync;
