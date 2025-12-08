import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const BASIC_PLAN_DAILY_LIMIT = 10;
const PRO_PLAN_DAILY_LIMIT = 24;

interface DailyArtesLimitResult {
  copiesUsed: number;
  remainingCopies: number;
  hasReachedLimit: boolean;
  isLoading: boolean;
  recordCopy: (arteId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export const useDailyArtesLimit = (user: User | null, planType: string | null): DailyArtesLimitResult => {
  const [copiesUsed, setCopiesUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Apply limit based on plan type
  const isBasicPlan = planType === "artes_basico";
  const isProPlan = planType === "artes_pro";
  const hasLimit = isBasicPlan || isProPlan;
  const dailyLimit = isBasicPlan ? BASIC_PLAN_DAILY_LIMIT : isProPlan ? PRO_PLAN_DAILY_LIMIT : Infinity;

  const fetchDailyCount = useCallback(async () => {
    if (!user) {
      setCopiesUsed(0);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_daily_arte_copy_count', {
        _user_id: user.id
      });

      if (error) {
        console.error("Error fetching daily arte copy count:", error);
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

  const recordCopy = async (arteId: string): Promise<boolean> => {
    if (!user) return false;
    
    // Check if limit reached (for basic and pro plans)
    if (hasLimit && copiesUsed >= dailyLimit) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('daily_arte_copies')
        .insert({
          user_id: user.id,
          arte_id: arteId,
          copy_date: new Date().toISOString().split('T')[0]
        });

      if (error) {
        console.error("Error recording arte copy:", error);
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
