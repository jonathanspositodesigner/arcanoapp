import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook para limpar jobs da fila quando usuário sai da página
 * 
 * Funciona em duas camadas:
 * 1. beforeunload: tenta cancelar imediatamente quando usuário fecha a aba
 * 2. Cleanup no unmount: cancela se ainda estiver na fila
 * 
 * IMPORTANTE: 
 * - Jobs 'queued' são cancelados com reembolso automático
 * - Jobs 'starting' ou 'running' mostram aviso mas NÃO são cancelados
 *   (créditos já consumidos na API externa)
 * 
 * @param sessionId - ID único da sessão do usuário
 * @param status - Status atual do job ('queued', 'running', etc)
 */
export function useQueueSessionCleanup(
  sessionId: string | null,
  status: string
) {
  // Usar ref para sempre ter o status mais atual (evita stale closures)
  const statusRef = useRef(status);
  const sessionIdRef = useRef(sessionId);
  
  // Atualizar refs quando valores mudam
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);
  
  // Verifica se está em estado que pode ser cancelado COM REEMBOLSO
  const canCancelWithRefund = useCallback(() => {
    // CRÍTICO: Só cancela com reembolso se estiver ESPECIFICAMENTE na fila
    return statusRef.current === 'queued';
  }, []);
  
  // Verifica se está em estado ativo (running/starting) - aviso sem cancelamento
  const isActiveWithoutRefund = useCallback(() => {
    return ['starting', 'running'].includes(statusRef.current);
  }, []);
  
  // Função para cancelar jobs da sessão (apenas queued)
  const cancelSessionJobs = useCallback(async () => {
    const currentSessionId = sessionIdRef.current;
    
    // Só cancela se tiver sessionId E estiver na fila
    if (!currentSessionId || !canCancelWithRefund()) {
      console.log('[QueueCleanup] Skipping cancel - status:', statusRef.current);
      return;
    }
    
    console.log('[QueueCleanup] Cancelling queued job for session:', currentSessionId);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/runninghub-queue-manager/cancel-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ sessionId: currentSessionId }),
          // keepalive permite que a requisição continue mesmo após a página fechar
          keepalive: true,
        }
      );
      
      if (response.ok) {
        console.log('[QueueCleanup] Session jobs cancelled successfully');
      }
    } catch (error) {
      console.error('[QueueCleanup] Failed to cancel session:', error);
    }
  }, [canCancelWithRefund]);
  
  // Configurar beforeunload - aviso para AMBOS os casos
  useEffect(() => {
    if (!sessionId) return;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const currentStatus = statusRef.current;
      
      // Se estiver na fila (queued) - aviso + cancelamento com reembolso
      if (currentStatus === 'queued') {
        cancelSessionJobs();
        e.preventDefault();
        e.returnValue = 'Você tem um job na fila. Se sair, ele será cancelado e os créditos devolvidos.';
        return e.returnValue;
      }
      
      // Se estiver rodando (starting/running) - apenas aviso SEM cancelamento
      // Créditos já foram consumidos, só avisamos que vai perder o resultado
      if (['starting', 'running'].includes(currentStatus)) {
        e.preventDefault();
        e.returnValue = 'Você tem um processamento em andamento. Se sair, perderá o resultado e os créditos serão cobrados.';
        return e.returnValue;
      }
      
      // Se completed/failed/cancelled - não faz nada
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sessionId, cancelSessionJobs]);
  
  // Cleanup no unmount - SÓ se ainda estiver queued
  useEffect(() => {
    return () => {
      // Cleanup: só cancela se AINDA estiver na fila (com reembolso)
      if (statusRef.current === 'queued' && sessionIdRef.current) {
        console.log('[QueueCleanup] Component unmounting while queued, cancelling...');
        
        // Fire-and-forget com keepalive
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/runninghub-queue-manager/cancel-session`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ sessionId: sessionIdRef.current }),
            keepalive: true,
          }
        ).catch(console.error);
      }
      // Se estiver running/starting - NÃO cancela (perderia créditos de qualquer jeito)
    };
  }, []); // Empty deps - só roda no mount/unmount
  
  return { cancelSessionJobs, isActiveWithoutRefund };
}
