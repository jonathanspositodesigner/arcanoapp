/**
 * Defensive helper: marks a pending job as failed in the database.
 * Used in catch blocks of AI tool pages to prevent orphan pending jobs
 * when the Edge Function invocation fails (network error, gateway error, etc.)
 * 
 * This is a fire-and-forget safety net - errors are logged but never thrown.
 */
import { supabase } from '@/integrations/supabase/client';

const TABLE_NAME_MAP: Record<string, string> = {
  upscaler: 'upscaler_jobs',
  pose_changer: 'pose_changer_jobs',
  veste_ai: 'veste_ai_jobs',
  video_upscaler: 'video_upscaler_jobs',
  arcano_cloner: 'arcano_cloner_jobs',
  character_generator: 'character_generator_jobs',
  flyer_maker: 'flyer_maker_jobs',
  bg_remover: 'bg_remover_jobs',
  image_generator: 'image_generator_jobs',
  video_generator: 'video_generator_jobs',
};

export async function markJobAsFailedInDb(
  jobId: string | null,
  toolType: string,
  errorMessage: string
): Promise<void> {
  if (!jobId) return;

  const tableName = TABLE_NAME_MAP[toolType];
  if (!tableName) {
    console.error(`[markJobAsFailedInDb] Unknown tool type: ${toolType}`);
    return;
  }

  try {
    const { error } = await supabase.rpc('mark_pending_job_as_failed', {
      p_table_name: tableName,
      p_job_id: jobId,
      p_error_message: `Erro no cliente: ${(errorMessage || 'Desconhecido').substring(0, 200)}`,
    });

    if (error) {
      console.error(`[markJobAsFailedInDb] RPC error for job ${jobId}:`, error);
    } else {
      console.log(`[markJobAsFailedInDb] Job ${jobId} marked as failed in ${tableName}`);
    }
  } catch (e) {
    console.error(`[markJobAsFailedInDb] Exception for job ${jobId}:`, e);
  }
}
