/**
 * Hook que integra o JobManager com o sistema de notificação global
 * 
 * Responsabilidades:
 * - Registrar job no contexto global quando iniciar
 * - Atualizar status no contexto quando mudar
 * - Limpar job quando terminar ou usuário resetar
 * - Funciona automaticamente com o sistema de som e trava de navegação
 * 
 * COMO USAR:
 * 
 * const { registerAndSubscribe, clearJob } = useAIJobWithNotification();
 * 
 * // Quando iniciar job:
 * registerAndSubscribe('upscaler', jobId, 'Upscaler Arcano', (update) => {
 *   setStatus(update.status);
 *   if (update.outputUrl) setOutputUrl(update.outputUrl);
 * });
 * 
 * // Quando usuário resetar:
 * clearJob();
 */

import { useCallback, useRef } from 'react';
import { useAIJob } from '@/contexts/AIJobContext';
import { subscribeToJob, ToolType, JobStatus, JobUpdate } from '@/ai/JobManager';

interface UseAIJobWithNotificationResult {
  /**
   * Registra o job no contexto global e configura subscription
   * O som será tocado automaticamente quando completar
   */
  registerAndSubscribe: (
    toolType: ToolType,
    jobId: string,
    toolDisplayName: string,
    initialStatus: JobStatus,
    onUpdate: (update: JobUpdate) => void
  ) => () => void;
  
  /**
   * Limpa o job do contexto global
   * Chamar quando usuário clicar em "Processar Nova Imagem" ou similar
   */
  clearJob: () => void;
  
  /**
   * Acesso direto ao estado do contexto
   */
  isJobActive: boolean;
  activeToolName: string | null;
  jobStatus: JobStatus | null;
}

export function useAIJobWithNotification(): UseAIJobWithNotificationResult {
  const { 
    registerJob, 
    updateJobStatus, 
    clearJob: contextClearJob,
    isJobActive,
    activeToolName,
    jobStatus,
  } = useAIJob();
  
  // Ref para a função de unsubscribe
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  const registerAndSubscribe = useCallback((
    toolType: ToolType,
    jobId: string,
    toolDisplayName: string,
    initialStatus: JobStatus,
    onUpdate: (update: JobUpdate) => void
  ) => {
    // Limpar subscription anterior se existir
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    
    // Registrar no contexto global
    registerJob(jobId, toolDisplayName, initialStatus);
    
    // Configurar subscription com callback de status
    const unsubscribe = subscribeToJob(
      toolType,
      jobId,
      onUpdate,
      // Callback para atualizar status no contexto (dispara som automaticamente)
      updateJobStatus
    );
    
    unsubscribeRef.current = unsubscribe;
    
    return unsubscribe;
  }, [registerJob, updateJobStatus]);
  
  const clearJob = useCallback(() => {
    // Limpar subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    // Limpar contexto
    contextClearJob();
  }, [contextClearJob]);
  
  return {
    registerAndSubscribe,
    clearJob,
    isJobActive,
    activeToolName,
    jobStatus,
  };
}
