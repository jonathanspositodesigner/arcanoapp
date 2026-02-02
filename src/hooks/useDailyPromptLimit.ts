import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const BASIC_PLAN_DAILY_LIMIT = 5;
const PRO_PLAN_DAILY_LIMIT = 10;

interface DailyPromptLimitResult {
  copiesUsed: number;
  remainingCopies: number;
  hasReachedLimit: boolean;
  isLoading: boolean;
  recordCopy: (promptId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export const useDailyPromptLimit = (user: User | null, planType: string | null): DailyPromptLimitResult => {
  const [copiesUsed, setCopiesUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Apply limit based on plan type
  const isBasicPlan = planType === "arcano_basico";
  const isProPlan = planType === "arcano_pro";
  const hasLimit = isBasicPlan || isProPlan;
  const dailyLimit = isBasicPlan ? BASIC_PLAN_DAILY_LIMIT : isProPlan ? PRO_PLAN_DAILY_LIMIT : Infinity;

  const fetchDailyCount = useCallback(async () => {
    if (!user) {
      setCopiesUsed(0);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_daily_copy_count', {
        _user_id: user.id
      });

      if (error) {
        console.error("Error fetching daily copy count:", error);
        setCopiesUsed(0);
      } else {
        setCopiesUsed(data || 0);
      }
    } catch (err) {
      console.error("Error in fetchDailyCount:", err);
      setCopiesUsed(0);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDailyCount();
  }, [fetchDailyCount]);

  const recordCopy = async (promptId: string): Promise<boolean> => {
    if (!user) return false;
    
    // Check if limit reached (for basic and pro plans)
    if (hasLimit && copiesUsed >= dailyLimit) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('daily_prompt_copies')
        .insert({
          user_id: user.id,
          prompt_id: promptId,
          copy_date: new Date().toISOString().split('T')[0]
        });

      if (error) {
        console.error("Error recording copy:", error);
        return false;
      }

      // Update local count
      setCopiesUsed(prev => prev + 1);
      return true;
    } catch (err) {
      console.error("Error in recordCopy:", err);
      return false;
    }
  };

  return {
    copiesUsed,
    remainingCopies: Math.max(0, dailyLimit - copiesUsed),
    hasReachedLimit: hasLimit && copiesUsed >= dailyLimit,
    isLoading,
    recordCopy,
    refetch: fetchDailyCount
  };
};
