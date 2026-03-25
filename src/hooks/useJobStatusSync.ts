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

// Configurações do polling de backup
const POLLING_CONFIG = {
  INITIAL_DELAY_MS: 5000,   // 5s - verificar mais cedo
  INTERVAL_MS: 5000,        // 5s entre polls
  MAX_DURATION_MS: 600000,  // 10 min - acompanha o timer absoluto
} as const;

// Timer absoluto de segurança - NENHUM job fica ativo por mais de 10 minutos
const ABSOLUTE_TIMEOUT_MS = 600000; // 10 minutos

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
        if (elapsed >= POLLING_CONFIG.MAX_DURATION_MS) {
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
    
    // 4. TIMER ABSOLUTO DE 10 MINUTOS
    absoluteTimeoutRef.current = setTimeout(async () => {
      if (isCompletedRef.current) return;
      
      console.log('[JobSync] ⚠️ ABSOLUTE TIMEOUT (10 min) reached! Forcing final check...');
      
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
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (isCompletedRef.current) return;
      
      console.log('[JobSync] ❌ Job still active after 10 min, forcing server-side cancellation');
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
              errorMessage: 'Timeout: job excedeu 10 minutos sem resposta do provedor',
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
        errorMessage: 'Tempo limite de processamento excedido (10 min). Seus créditos serão estornados automaticamente.',
      });
      
      doCleanup();
    }, ABSOLUTE_TIMEOUT_MS);
    
    // Cleanup on unmount/deps change
    return () => {
      clearTimeout(pollingDelayTimeout);
      doCleanup();
    };
  }, [enabled, jobId, toolType, tableName]); // ← Apenas dependências ESTÁVEIS
  
  return { cleanup: () => cleanupRef.current() };
}

export default useJobStatusSync;
