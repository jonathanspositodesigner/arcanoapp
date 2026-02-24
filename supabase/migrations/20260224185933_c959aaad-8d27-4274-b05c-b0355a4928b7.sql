
-- Tabela separada para os novos planos da pagina /planos-2
CREATE TABLE public.planos2_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  plan_slug TEXT NOT NULL DEFAULT 'free',
  is_active BOOLEAN NOT NULL DEFAULT true,
  credits_per_month INTEGER NOT NULL DEFAULT 300,
  daily_prompt_limit INTEGER, -- null = ilimitado
  has_image_generation BOOLEAN NOT NULL DEFAULT false,
  has_video_generation BOOLEAN NOT NULL DEFAULT false,
  greenn_product_id INTEGER,
  greenn_contract_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.planos2_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can view own subscription"
  ON public.planos2_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update/delete (via edge functions)
CREATE POLICY "Service role can manage subscriptions"
  ON public.planos2_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER update_planos2_subscriptions_updated_at
  BEFORE UPDATE ON public.planos2_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RPC to reset monthly credits for all active planos2 users (for cron)
CREATE OR REPLACE FUNCTION public.reset_planos2_monthly_credits()
RETURNS TABLE(users_reset integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sub RECORD;
  reset_count INTEGER := 0;
BEGIN
  FOR sub IN 
    SELECT user_id, credits_per_month 
    FROM planos2_subscriptions 
    WHERE is_active = true 
    AND credits_per_month > 0
    AND (expires_at IS NULL OR expires_at > now())
  LOOP
    PERFORM reset_upscaler_credits(sub.user_id, sub.credits_per_month, 'Reset mensal - Plano v2');
    reset_count := reset_count + 1;
  END LOOP;
  
  RETURN QUERY SELECT reset_count;
END;
$$;
