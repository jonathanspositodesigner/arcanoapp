import { useEffect, useRef, useCallback } from 'react';

interface ReconcileResult {
  taskId: string;
  rhStatus: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'UNKNOWN' | 'NO_TASK_ID';
  errorCode?: string;
  errorMessage?: string;
  results?: any[];
  jobStatus: string;
  updated: boolean;
}

interface UseJobReconciliationOptions {
  table: string;
  jobId: string | null;
  status: string;
  /** Intervalo de polling em ms (default: 15000 = 15s) */
  pollingInterval?: number;
  /** Habilitar ou desabilitar o polling */
  enabled?: boolean;
}

/**
 * Hook para polling de reconciliação de jobs de IA
 * Verifica periodicamente o status real no RunningHub e atualiza o banco
 * Serve como fallback quando o webhook não chega
 * 
 * IMPORTANTE: Este hook NÃO dispara callbacks para a UI.
 * O único responsável por atualizar a UI é o Realtime (webhook) ou timeout.
 * Este polling serve apenas para "self-healing" silencioso do banco.
 */
export function useJobReconciliation({
  table,
  jobId,
  status,
  pollingInterval = 15000,
  enabled = true,
}: UseJobReconciliationOptions) {
  const intervalRef = useRef<number | null>(null);
  const isReconcilingRef = useRef(false);

  const reconcileTask = useCallback(async (): Promise<ReconcileResult | null> => {
    if (!jobId || !table) return null;
    if (isReconcilingRef.current) return null;
    
    isReconcilingRef.current = true;
    
    try {
      console.log(`[Reconciliation] Checking ${table}/${jobId}...`);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/runninghub-queue-manager/reconcile-task`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ table, jobId }),
        }
      );
      
      if (!response.ok) {
        console.error(`[Reconciliation] Failed: ${response.status}`);
        return null;
      }
      
      const result: ReconcileResult = await response.json();
      console.log(`[Reconciliation] Result:`, result);
      
      // IMPORTANTE: Não disparamos callback para a UI!
      // O Realtime vai pegar a mudança no banco e atualizar a UI.
      // Este polling serve apenas para garantir que o banco esteja atualizado.
      
      return result;
    } catch (error) {
      console.error('[Reconciliation] Error:', error);
      // Erros de polling são silenciosos - não afetam a UI
      return null;
    } finally {
      isReconcilingRef.current = false;
    }
  }, [jobId, table]);

  // Iniciar/parar polling baseado no status
  useEffect(() => {
    // Só fazer polling quando o job está em status "running" ou "processing"
    const shouldPoll = enabled && jobId && (status === 'running' || status === 'processing');
    
    if (shouldPoll) {
      console.log(`[Reconciliation] Starting polling for ${table}/${jobId}`);
      
      // Primeira verificação após delay inicial (dar tempo pro webhook chegar)
      const initialTimeout = setTimeout(() => {
        reconcileTask();
      }, pollingInterval);
      
      // Polling contínuo
      intervalRef.current = window.setInterval(() => {
        reconcileTask();
      }, pollingInterval);
      
      return () => {
        clearTimeout(initialTimeout);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      // Limpar intervalo se não deve mais fazer polling
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [enabled, jobId, status, table, pollingInterval, reconcileTask]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    reconcileNow: reconcileTask,
    isReconciling: isReconcilingRef.current,
  };
}
