import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para limpar jobs da fila quando usuário sai da página
 * 
 * Funciona em duas camadas:
 * 1. beforeunload: tenta cancelar imediatamente quando usuário fecha a aba
 * 2. Supabase Presence: detecta desconexão e cancela no servidor
 * 
 * @param sessionId - ID único da sessão do usuário
 * @param status - Status atual do job ('queued', 'running', etc)
 */
export function useQueueSessionCleanup(
  sessionId: string | null,
  status: string
) {
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isQueuedRef = useRef(false);
  
  // Atualizar ref quando status muda
  // Include 'waiting' status which is used in Upscaler when job enters queue via realtime
  useEffect(() => {
    isQueuedRef.current = status === 'queued' || status === 'waiting' || status === 'uploading';
  }, [status]);
  
  // Função para cancelar jobs da sessão
  const cancelSessionJobs = useCallback(async () => {
    if (!sessionId || !isQueuedRef.current) return;
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/runninghub-queue-manager/cancel-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ sessionId }),
          // keepalive permite que a requisição continue mesmo após a página fechar
          keepalive: true,
        }
      );
      
      if (response.ok) {
        console.log('[QueueCleanup] Session jobs cancelled');
      }
    } catch (error) {
      console.error('[QueueCleanup] Failed to cancel session:', error);
    }
  }, [sessionId]);
  
  // Configurar beforeunload
  useEffect(() => {
    if (!sessionId) return;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Só mostrar confirmação e cancelar se estiver na fila
      if (isQueuedRef.current) {
        // Tentar cancelar via fetch com keepalive
        cancelSessionJobs();
        
        // Mostrar confirmação ao usuário
        e.preventDefault();
        e.returnValue = 'Você tem um job na fila. Se sair, ele será cancelado.';
        return e.returnValue;
      }
    };
    
    const handleVisibilityChange = () => {
      // Quando a aba fica oculta, não cancela - só quando fecha
      // Isso é tratado pelo beforeunload
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sessionId, cancelSessionJobs]);
  
  // Configurar Supabase Presence para backup
  useEffect(() => {
    if (!sessionId) return;
    
    const channelName = `queue-session:${sessionId}`;
    
    presenceChannelRef.current = supabase.channel(channelName, {
      config: {
        presence: {
          key: sessionId,
        },
      },
    });
    
    presenceChannelRef.current
      .on('presence', { event: 'sync' }, () => {
        console.log('[QueueCleanup] Presence synced');
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannelRef.current?.track({
            online_at: new Date().toISOString(),
            status: 'active',
          });
        }
      });
    
    return () => {
      if (presenceChannelRef.current) {
        // Ao desmontar, cancelar jobs se ainda na fila
        if (isQueuedRef.current) {
          cancelSessionJobs();
        }
        presenceChannelRef.current.unsubscribe();
        presenceChannelRef.current = null;
      }
    };
  }, [sessionId, cancelSessionJobs]);
  
  return { cancelSessionJobs };
}
