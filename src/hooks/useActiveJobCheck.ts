import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ActiveJobResult {
  hasActiveJob: boolean;
  activeTool: string | null;
  activeJobId?: string;
  activeStatus?: string;
}

interface CancelJobResult {
  success: boolean;
  refundedAmount: number;
  errorMessage?: string;
}

// Map tool names to table names
const TOOL_TABLE_MAP: Record<string, string> = {
  'Upscaler Arcano': 'upscaler_jobs',
  'Video Upscaler': 'video_upscaler_jobs',
  'Pose Changer': 'pose_changer_jobs',
  'Veste AI': 'veste_ai_jobs',
};

export function useActiveJobCheck() {
  const checkActiveJob = useCallback(async (userId: string): Promise<ActiveJobResult> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/runninghub-queue-manager/check-user-active`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ userId }),
        }
      );
      
      if (!response.ok) {
        console.error('[ActiveJobCheck] Failed:', response.status);
        return { hasActiveJob: false, activeTool: null };
      }
      
      return await response.json();
    } catch (error) {
      console.error('[ActiveJobCheck] Error:', error);
      return { hasActiveJob: false, activeTool: null };
    }
  }, []);
  
  const cancelActiveJob = useCallback(async (
    toolName: string, 
    jobId: string
  ): Promise<CancelJobResult> => {
    try {
      // Get table name from tool name
      const tableName = TOOL_TABLE_MAP[toolName];
      if (!tableName) {
        console.error('[ActiveJobCheck] Unknown tool:', toolName);
        return { 
          success: false, 
          refundedAmount: 0, 
          errorMessage: 'Ferramenta desconhecida' 
        };
      }
      
      console.log(`[ActiveJobCheck] Cancelling job ${jobId} in ${tableName}`);
      
      // Call the SQL function directly via RPC
      const { data, error } = await supabase.rpc('user_cancel_ai_job', {
        p_table_name: tableName,
        p_job_id: jobId,
      });
      
      if (error) {
        console.error('[ActiveJobCheck] Cancel error:', error);
        return { 
          success: false, 
          refundedAmount: 0, 
          errorMessage: error.message 
        };
      }
      
      // RPC returns an array of results
      const result = Array.isArray(data) ? data[0] : data;
      
      console.log('[ActiveJobCheck] Cancel result:', result);
      
      return {
        success: result?.success ?? false,
        refundedAmount: result?.refunded_amount ?? 0,
        errorMessage: result?.error_message ?? undefined,
      };
    } catch (error) {
      console.error('[ActiveJobCheck] Cancel error:', error);
      return { 
        success: false, 
        refundedAmount: 0, 
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    }
  }, []);
  
  return { checkActiveJob, cancelActiveJob };
}
