import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Planos2Subscription {
  plan_slug: string;
  is_active: boolean;
  credits_per_month: number;
  daily_prompt_limit: number | null;
  has_image_generation: boolean;
  has_video_generation: boolean;
}

export const usePlanos2Access = (userId?: string) => {
  const [subscription, setSubscription] = useState<Planos2Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from('planos2_subscriptions')
          .select('plan_slug, is_active, credits_per_month, daily_prompt_limit, has_image_generation, has_video_generation')
          .eq('user_id', userId)
          .maybeSingle();

        if (!error && data) {
          setSubscription(data as Planos2Subscription);
        }
      } catch (err) {
        console.error('[usePlanos2Access] Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, [userId]);

  return {
    subscription,
    isLoading,
    hasImageGeneration: subscription?.has_image_generation ?? true, // default true for users without planos2 (legacy)
    hasVideoGeneration: subscription?.has_video_generation ?? true,
    isPlanos2User: !!subscription,
    planSlug: subscription?.plan_slug ?? null,
  };
};
