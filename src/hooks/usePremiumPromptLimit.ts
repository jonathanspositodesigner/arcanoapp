import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface PremiumPromptLimitResult {
  unlocksUsed: number;
  remainingUnlocks: number;
  dailyLimit: number;
  hasReachedLimit: boolean;
  isUnlimited: boolean;
  isLoading: boolean;
  unlockedPromptIds: Set<string>;
  isPromptUnlocked: (promptId: string) => boolean;
  unlockPrompt: (promptId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

/**
 * Returns the daily premium prompt limit based on plan.
 * Starter=5, Pro=10, Ultimate=20, Unlimited=Infinity, no plan=0
 */
const getPremiumPromptLimit = (planType: string | null): number => {
  if (!planType) return 0;
  const lower = planType.toLowerCase();
  if (lower.includes('unlimited')) return Infinity;
  if (lower.includes('ultimate')) return 20;
  if (lower.includes('pro')) return 10;
  if (lower.includes('starter')) return 5;
  // Legacy plans
  if (lower === 'arcano_basico') return 5;
  if (lower === 'arcano_pro') return 10;
  return 0;
};

export const usePremiumPromptLimit = (
  user: User | null,
  isPremium: boolean,
  planType: string | null
): PremiumPromptLimitResult => {
  const [unlocksUsed, setUnlocksUsed] = useState(0);
  const [unlockedPromptIds, setUnlockedPromptIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const dailyLimit = isPremium ? getPremiumPromptLimit(planType) : 0;
  const isUnlimited = dailyLimit === Infinity;

  const fetchData = useCallback(async () => {
    if (!user) {
      setUnlocksUsed(0);
      setUnlockedPromptIds(new Set());
      setIsLoading(false);
      return;
    }

    try {
      const [countResult, idsResult] = await Promise.all([
        supabase.rpc('get_daily_premium_unlock_count', { _user_id: user.id }),
        supabase.rpc('get_user_unlocked_prompts_today', { _user_id: user.id })
      ]);

      setUnlocksUsed(countResult.data || 0);
      
      if (idsResult.data) {
        setUnlockedPromptIds(new Set(
          (idsResult.data as { prompt_id: string }[]).map(r => r.prompt_id)
        ));
      }
    } catch (err) {
      console.error("Error fetching premium unlock data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isPromptUnlocked = useCallback((promptId: string): boolean => {
    if (!isPremium) return false;
    return unlockedPromptIds.has(promptId);
 }, [isPremium, unlockedPromptIds]);

  const unlockPrompt = async (promptId: string): Promise<boolean> => {
    if (!user || !isPremium) return false;
    
    // Already unlocked today
    if (unlockedPromptIds.has(promptId)) return true;
    
    // Check limit (not for unlimited)
    if (!isUnlimited && unlocksUsed >= dailyLimit) return false;

    try {
      const { error } = await supabase
        .from('daily_premium_unlocks')
        .insert({
          user_id: user.id,
          prompt_id: promptId,
        });

      if (error) {
        // Unique constraint violation = already unlocked
        if (error.code === '23505') return true;
        console.error("Error unlocking prompt:", error);
        return false;
      }

      setUnlocksUsed(prev => prev + 1);
      setUnlockedPromptIds(prev => new Set(prev).add(promptId));
      return true;
    } catch (err) {
      console.error("Error in unlockPrompt:", err);
      return false;
    }
  };

  return {
    unlocksUsed,
    remainingUnlocks: isUnlimited ? Infinity : Math.max(0, dailyLimit - unlocksUsed),
    dailyLimit,
    hasReachedLimit: !isUnlimited && isPremium && unlocksUsed >= dailyLimit,
    isUnlimited,
    isLoading,
    unlockedPromptIds,
    isPromptUnlocked,
    unlockPrompt,
    refetch: fetchData
  };
};