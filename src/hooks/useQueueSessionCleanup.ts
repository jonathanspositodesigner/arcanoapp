import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para limpar jobs da fila quando usuário sai da página
 * 
 * Funciona em duas camadas:
 * 1. beforeunload: tenta cancelar imediatamente quando usuário fecha a aba
 * 2. Cleanup no unmount: cancela se ainda estiver na fila
 * 
 * IMPORTANTE: Só cancela jobs com status 'queued' - jobs 'running' ou 'completed'
 * não são afetados para evitar perda de resultados.
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
  
  // Verifica se está em estado que pode ser cancelado
  const canCancel = useCallback(() => {
    // CRÍTICO: Só cancela se estiver ESPECIFICAMENTE na fila
    // Não cancela running/completed/failed/etc
    return statusRef.current === 'queued';
  }, []);
  
  // Função para cancelar jobs da sessão
  const cancelSessionJobs = useCallback(async () => {
    const currentSessionId = sessionIdRef.current;
    
    // Só cancela se tiver sessionId E estiver na fila
    if (!currentSessionId || !canCancel()) {
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
  }, [canCancel]);
  
  // Configurar beforeunload
  useEffect(() => {
    if (!sessionId) return;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Só mostrar confirmação e cancelar se estiver NA FILA (queued)
      if (statusRef.current === 'queued') {
        // Tentar cancelar via fetch com keepalive
        cancelSessionJobs();
        
        // Mostrar confirmação ao usuário
        e.preventDefault();
        e.returnValue = 'Você tem um job na fila. Se sair, ele será cancelado.';
        return e.returnValue;
      }
      // Se está running/completed/failed - não faz nada, deixa continuar
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sessionId, cancelSessionJobs]);
  
  // Cleanup no unmount - SÓ se ainda estiver queued
  useEffect(() => {
    // Função vazia no mount
    return () => {
      // Cleanup: só cancela se AINDA estiver na fila
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
    };
  }, []); // Empty deps - só roda no mount/unmount
  
  return { cancelSessionJobs };
}
