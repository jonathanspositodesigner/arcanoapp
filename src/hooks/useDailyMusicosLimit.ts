import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePremiumMusicosStatus } from './usePremiumMusicosStatus';
import { toast } from 'sonner';

interface DailyMusicosLimitResult {
  downloadCount: number;
  dailyLimit: number;
  canDownload: boolean;
  isLoading: boolean;
  recordDownload: (arteId: string) => Promise<boolean>;
  refreshCount: () => Promise<void>;
}

export const useDailyMusicosLimit = (): DailyMusicosLimitResult => {
  const [downloadCount, setDownloadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { isPremium, planType, isLoading: isPremiumLoading } = usePremiumMusicosStatus();

  // Determine daily limit based on plan type
  const getDailyLimit = useCallback(() => {
    if (!isPremium) return 0; // No access if not premium
    
    const planLower = (planType || '').toLowerCase();
    
    if (planLower.includes('unlimited') || planLower.includes('ilimitado')) {
      return Infinity;
    }
    if (planLower.includes('pro')) {
      return 10;
    }
    // Default to basic
    return 5;
  }, [isPremium, planType]);

  const dailyLimit = getDailyLimit();
  const canDownload = downloadCount < dailyLimit;

  const fetchDownloadCount = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDownloadCount(0);
        return;
      }

      const { data, error } = await supabase.rpc('get_daily_musicos_download_count', {
        _user_id: user.id
      });

      if (error) throw error;
      setDownloadCount(data || 0);
    } catch (error) {
      console.error('Error fetching download count:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const recordDownload = useCallback(async (arteId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Você precisa estar logado para fazer download.');
        return false;
      }

      // Check if already recorded for this arte today (unique constraint handles this)
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase
        .from('daily_musicos_downloads')
        .select('id')
        .eq('user_id', user.id)
        .eq('arte_id', arteId)
        .eq('download_date', today)
        .maybeSingle();

      // If already exists for this arte today, allow action without counting again
      if (existing) {
        return true;
      }

      // Check limit before inserting
      if (!canDownload && dailyLimit !== Infinity) {
        toast.error(`Limite de ${dailyLimit} downloads por dia atingido!`, {
          description: 'Faça upgrade do seu plano para mais downloads.'
        });
        return false;
      }

      // Insert new record
      const { error } = await supabase
        .from('daily_musicos_downloads')
        .insert({
          user_id: user.id,
          arte_id: arteId
        });

      if (error) {
        // If unique constraint violation, it means record already exists (race condition)
        if (error.code === '23505') {
          return true;
        }
        throw error;
      }

      setDownloadCount(prev => prev + 1);
      
      // Show remaining downloads if not unlimited
      if (dailyLimit !== Infinity) {
        const remaining = dailyLimit - downloadCount - 1;
        if (remaining <= 2 && remaining > 0) {
          toast.info(`Restam ${remaining} downloads hoje.`);
        }
      }

      return true;
    } catch (error) {
      console.error('Error recording download:', error);
      toast.error('Erro ao registrar download.');
      return false;
    }
  }, [canDownload, dailyLimit, downloadCount]);

  const refreshCount = useCallback(async () => {
    setIsLoading(true);
    await fetchDownloadCount();
  }, [fetchDownloadCount]);

  useEffect(() => {
    if (!isPremiumLoading) {
      fetchDownloadCount();
    }
  }, [fetchDownloadCount, isPremiumLoading]);

  return {
    downloadCount,
    dailyLimit,
    canDownload,
    isLoading: isLoading || isPremiumLoading,
    recordDownload,
    refreshCount
  };
};
