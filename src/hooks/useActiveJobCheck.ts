 import { useCallback } from 'react';
 
 interface ActiveJobResult {
   hasActiveJob: boolean;
   activeTool: string | null;
   activeJobId?: string;
   activeStatus?: string;
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
   
   return { checkActiveJob };
 }