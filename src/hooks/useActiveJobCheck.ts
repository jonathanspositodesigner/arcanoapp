import { useCallback } from 'react';

export interface ActiveJobResult {
  hasActiveJob: boolean;
  activeTool: string | null;
  activeTable?: string;
  activeJobId?: string;
  activeStatus?: string;
  createdAt?: string;
  startedAt?: string;
}

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
  
  const cancelUserQueuedJobs = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/runninghub-queue-manager/cancel-session`,
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
        console.error('[ActiveJobCheck] Cancel failed:', response.status);
        return false;
      }
      
      const result = await response.json();
      console.log('[ActiveJobCheck] Cancelled jobs:', result);
      return result.success || result.cancelledCount > 0;
    } catch (error) {
      console.error('[ActiveJobCheck] Cancel error:', error);
      return false;
    }
  }, []);
  
  /**
   * Force cancel any job (running or queued)
   * Used when user wants to manually cancel an active job
   */
  const forceCancelJob = useCallback(async (
    table: string, 
    jobId: string, 
    userId: string
  ): Promise<{ success: boolean; refunded?: number; wasRunning?: boolean }> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/runninghub-queue-manager/force-cancel-job`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ table, jobId, userId }),
        }
      );
      
      if (!response.ok) {
        console.error('[ActiveJobCheck] Force cancel failed:', response.status);
        return { success: false };
      }
      
      const result = await response.json();
      console.log('[ActiveJobCheck] Force cancelled job:', result);
      return {
        success: result.success || result.cancelled,
        refunded: result.refunded,
        wasRunning: result.wasRunning,
      };
    } catch (error) {
      console.error('[ActiveJobCheck] Force cancel error:', error);
      return { success: false };
    }
  }, []);
  
  return { checkActiveJob, cancelUserQueuedJobs, forceCancelJob };
}