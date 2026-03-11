import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface JobRecoveryResult {
  inputUrl: string | null;
  outputUrl: string | null;
  jobId: string;
  status: string;
  personImageUrl?: string | null;
  referenceImageUrl?: string | null;
  clothingImageUrl?: string | null;
}

type SupportedToolTable = 'upscaler_jobs' | 'pose_changer_jobs' | 'veste_ai_jobs' | 'video_upscaler_jobs' | 'arcano_cloner_jobs' | 'flyer_maker_jobs' | 'bg_remover_jobs';

// Central map: table -> select columns (avoids forgetting new tools)
const TABLE_SELECT_MAP: Record<SupportedToolTable, string> = {
  upscaler_jobs: 'id, status, input_url, output_url, user_id',
  pose_changer_jobs: 'id, status, person_image_url, reference_image_url, output_url, user_id',
  veste_ai_jobs: 'id, status, person_image_url, clothing_image_url, output_url, user_id',
  video_upscaler_jobs: 'id, status, input_url, output_url, user_id',
  arcano_cloner_jobs: 'id, status, user_image_url, reference_image_url, output_url, user_id',
  flyer_maker_jobs: 'id, status, reference_image_url, output_url, user_id',
  bg_remover_jobs: 'id, status, input_url, output_url, user_id',
};

interface UseNotificationTokenRecoveryProps {
  userId: string | null | undefined;
  toolTable: SupportedToolTable;
  onRecovery: (result: JobRecoveryResult) => void;
}

/**
 * Hook para recuperar estado do job via token de notificação temporário.
 * - Detecta ?nt= na URL
 * - Valida token via Edge Function
 * - Busca dados do job e chama callback
 * - Limpa URL após recuperação
 */
export function useNotificationTokenRecovery({
  userId,
  toolTable,
  onRecovery,
}: UseNotificationTokenRecoveryProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAttempted, setRecoveryAttempted] = useState(false);

  const notificationToken = searchParams.get('nt');

  const clearToken = useCallback(() => {
    if (notificationToken) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('nt');
      setSearchParams(newParams, { replace: true });
    }
  }, [notificationToken, searchParams, setSearchParams]);

  useEffect(() => {
    // Só tenta uma vez
    if (recoveryAttempted || !notificationToken) return;
    
    // Precisa de userId para verificar propriedade
    if (userId === undefined) return; // Ainda carregando auth
    
    const recoverFromToken = async () => {
      setIsRecovering(true);
      setRecoveryAttempted(true);
      
      try {
        console.log('[TokenRecovery] Verifying notification token:', notificationToken.substring(0, 8));
        
        // Verificar token via Edge Function
        const { data, error } = await supabase.functions.invoke('verify-notification-token', {
          body: { token: notificationToken, userId: userId || null }
        });

        if (error || !data?.valid) {
          console.log('[TokenRecovery] Invalid or expired token:', data?.error || error);
          clearToken();
          return;
        }

        // Token válido - buscar job
        const { table, jobId } = data;
        
        // Verificar se a tabela corresponde (segurança adicional)
        if (table !== toolTable) {
          console.log('[TokenRecovery] Table mismatch:', table, 'vs', toolTable);
          clearToken();
          return;
        }

        // Buscar dados do job usando mapa centralizado
        const selectColumns = TABLE_SELECT_MAP[toolTable];
        const { data: job } = await supabase
          .from(toolTable as any)
          .select(selectColumns)
          .eq('id', jobId)
          .maybeSingle();

        if (!job) {
          console.log('[TokenRecovery] Job not found:', jobId);
          clearToken();
          return;
        }

        // Verificar se é do usuário (se logado)
        if (userId && job.user_id !== userId) {
          console.log('[TokenRecovery] User mismatch');
          clearToken();
          return;
        }

        // Job encontrado e válido!
        console.log('[TokenRecovery] Job recovered successfully:', job.id);
        
        onRecovery({
          inputUrl: job.input_url || null,
          outputUrl: job.output_url || null,
          jobId: job.id,
          status: job.status,
          personImageUrl: job.person_image_url || null,
          referenceImageUrl: job.reference_image_url || null,
          clothingImageUrl: job.clothing_image_url || null,
        });

        // Limpar token da URL
        clearToken();
        
      } catch (err) {
        console.error('[TokenRecovery] Error:', err);
        clearToken();
      } finally {
        setIsRecovering(false);
      }
    };

    recoverFromToken();
  }, [notificationToken, userId, toolTable, onRecovery, recoveryAttempted, clearToken]);

  return {
    isRecovering,
    hasToken: !!notificationToken,
  };
}
