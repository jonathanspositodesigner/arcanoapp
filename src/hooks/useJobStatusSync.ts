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
 * 
 * COMO USAR:
 * ```tsx
 * useJobStatusSync({
 *   jobId,
 *   toolType: 'upscaler',
 *   enabled: status === 'processing' || status === 'waiting',
 *   onStatusChange: (update) => {
 *     if (update.status === 'completed') setOutputImage(update.outputUrl);
 *   }
 * });
 * ```
 */

import { useEffect, useRef, useCallback } from 'react';
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
  
  // Refs para controle de estado
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number | null>(null);
  const absoluteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastKnownStatusRef = useRef<JobStatus | null>(null);
  const isCompletedRef = useRef(false);
  
  // Função para processar update (usada por Realtime e Polling)
  const processUpdate = useCallback((data: any, source: 'realtime' | 'polling' | 'visibility') => {
    const status = data.status as JobStatus;
    
    // Evitar processar o mesmo status múltiplas vezes
    if (status === lastKnownStatusRef.current) {
      console.log(`[JobSync] ${source}: Status unchanged (${status}), skipping`);
      return;
    }
    
    console.log(`[JobSync] ${source}: Status changed ${lastKnownStatusRef.current} -> ${status}`);
    lastKnownStatusRef.current = status;
    
    // Notificar contexto global (para som de notificação)
    if (onGlobalStatusChange) {
      onGlobalStatusChange(status);
    }
    
    // Construir objeto de update
    const update: JobUpdate = {
      status,
      outputUrl: data.output_url,
      errorMessage: data.error_message,
      position: data.position,
    };
    
    // Marcar como completo para parar polling
    if (['completed', 'failed', 'cancelled'].includes(status)) {
      isCompletedRef.current = true;
      // Limpar timer absoluto - job terminou normalmente
      if (absoluteTimeoutRef.current) {
        clearTimeout(absoluteTimeoutRef.current);
        absoluteTimeoutRef.current = null;
      }
    }
    
    // Notificar componente
    onStatusChange(update);
  }, [onStatusChange, onGlobalStatusChange]);
  
  // Função de polling direto ao banco
  const pollJobStatus = useCallback(async () => {
    if (!jobId || isCompletedRef.current) return;
    
    // Verificar se passou do timeout máximo
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
          error_message: update.errorMessage,
          position: update.position,
        }, 'polling');
      }
    } catch (error) {
      console.error('[JobSync] Polling error:', error);
    }
  }, [jobId, toolType, tableName, processUpdate]);
  
  // Handler de visibilidade
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible' && enabled && jobId && !isCompletedRef.current) {
      console.log('[JobSync] Tab became visible, checking status');
      pollJobStatus();
    }
  }, [enabled, jobId, pollJobStatus]);
  
  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('[JobSync] Cleaning up');
    
    // Remover canal Realtime
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
    
    // Parar polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    // Parar timer absoluto
    if (absoluteTimeoutRef.current) {
      clearTimeout(absoluteTimeoutRef.current);
      absoluteTimeoutRef.current = null;
    }
    
    // Remover listener de visibilidade
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    
    // Reset refs
    pollingStartTimeRef.current = null;
    lastKnownStatusRef.current = null;
    isCompletedRef.current = false;
  }, [handleVisibilityChange]);
  
  // Effect principal - configura sincronização tripla
  useEffect(() => {
    if (!enabled || !jobId) {
      cleanup();
      return;
    }
    
    console.log(`[JobSync] Setting up triple sync for ${toolType} job ${jobId}`);
    isCompletedRef.current = false;
    lastKnownStatusRef.current = null;
    
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
    // Inicia após delay inicial
    const pollingDelayTimeout = setTimeout(() => {
      if (isCompletedRef.current) return;
      
      pollingStartTimeRef.current = Date.now();
      console.log('[JobSync] Starting backup polling');
      
      // Primeira verificação imediata
      pollJobStatus();
      
      // Depois a cada intervalo
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
    
    // 4. TIMER ABSOLUTO DE 10 MINUTOS - garante que NENHUM job fica órfão
    absoluteTimeoutRef.current = setTimeout(async () => {
      if (isCompletedRef.current) return;
      
      console.log('[JobSync] ⚠️ ABSOLUTE TIMEOUT (10 min) reached! Forcing final check...');
      
      // Última tentativa de buscar status real do banco
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
      
      // Esperar 2s para dar chance ao Realtime
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (isCompletedRef.current) return;
      
      // Job ainda ativo após 10 min = forçar falha NO SERVIDOR + estorno
      console.log('[JobSync] ❌ Job still active after 10 min, forcing server-side cancellation');
      isCompletedRef.current = true;
      
      // 1. CANCELAR NO BANCO via Queue Manager /finish (garante estorno idempotente)
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
        console.error('[JobSync] Failed to cancel job server-side (cleanup_all_stale_ai_jobs will catch it):', e);
      }
      
      // 2. DEPOIS notificar a UI
      if (onGlobalStatusChange) {
        onGlobalStatusChange('failed');
      }
      
      onStatusChange({
        status: 'failed',
        errorMessage: 'Tempo limite de processamento excedido (10 min). Seus créditos serão estornados automaticamente.',
      });
      
      cleanup();
    }, ABSOLUTE_TIMEOUT_MS);
    
    // Cleanup
    return () => {
      clearTimeout(pollingDelayTimeout);
      cleanup();
    };
  }, [enabled, jobId, toolType, tableName, processUpdate, pollJobStatus, handleVisibilityChange, cleanup]);
  
  return { cleanup };
}

export default useJobStatusSync;
