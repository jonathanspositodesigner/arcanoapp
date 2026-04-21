import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Planos2Subscription {
  plan_slug: string;
  is_active: boolean;
  credits_per_month: number;
  daily_prompt_limit: number | null;
  has_image_generation: boolean;
  has_video_generation: boolean;
  cost_multiplier: number;
  expires_at: string | null;
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
          .select('plan_slug, is_active, credits_per_month, daily_prompt_limit, has_image_generation, has_video_generation, cost_multiplier, expires_at')
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

  // Check if subscription is truly active (not expired)
  const isReallyActive = subscription?.is_active === true && 
    (!subscription?.expires_at || new Date(subscription.expires_at) > new Date());

  return {
    subscription,
    isLoading,
    // Acesso TOTAL: todas as ferramentas liberadas para qualquer usuário com créditos
    // (avulsos ou de plano). A cobrança de créditos já gerencia o uso.
    hasImageGeneration: true,
    hasVideoGeneration: true,
    isPlanos2User: !!subscription,
    isSubscriptionActive: isReallyActive,
    planSlug: subscription?.plan_slug ?? null,
    costMultiplier: subscription?.cost_multiplier ?? 1.0,
  };
};
