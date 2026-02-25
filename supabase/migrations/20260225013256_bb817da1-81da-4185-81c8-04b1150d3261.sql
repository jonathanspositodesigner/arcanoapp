
-- 1. Add last_credit_reset_at column
ALTER TABLE planos2_subscriptions 
ADD COLUMN IF NOT EXISTS last_credit_reset_at timestamptz DEFAULT now();

-- 2. Backfill existing users with their subscription creation date
UPDATE planos2_subscriptions 
SET last_credit_reset_at = created_at 
WHERE last_credit_reset_at IS NULL;

-- 3. Change default credits_per_month to 100 (Free plan renewal)
ALTER TABLE planos2_subscriptions 
ALTER COLUMN credits_per_month SET DEFAULT 100;

-- 4. Create individual monthly credits reset function
CREATE OR REPLACE FUNCTION public.reset_individual_monthly_credits()
RETURNS TABLE(users_reset integer)
LANGUAGE plpgsql SECURITY DEFINER
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
    AND last_credit_reset_at <= now() - INTERVAL '30 days'
  LOOP
    PERFORM reset_upscaler_credits(
      sub.user_id,
      sub.credits_per_month,
      'Reset mensal individual (30 dias)'
    );
    UPDATE planos2_subscriptions
    SET last_credit_reset_at = now()
    WHERE user_id = sub.user_id;
    reset_count := reset_count + 1;
  END LOOP;
  RETURN QUERY SELECT reset_count;
END;
$$;

-- 5. Update expire_planos2_subscriptions to use credits_per_month = 100 and reset last_credit_reset_at
CREATE OR REPLACE FUNCTION public.expire_planos2_subscriptions()
RETURNS TABLE(users_expired integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sub RECORD;
  expired_count INTEGER := 0;
BEGIN
  FOR sub IN
    SELECT user_id
    FROM planos2_subscriptions
    WHERE expires_at IS NOT NULL
      AND expires_at < now()
      AND plan_slug != 'free'
      AND is_active = true
  LOOP
    -- Reset subscription to free with 100 credits/month
    UPDATE planos2_subscriptions
    SET plan_slug = 'free',
        credits_per_month = 100,
        daily_prompt_limit = NULL,
        has_image_generation = false,
        has_video_generation = false,
        cost_multiplier = 1.0,
        expires_at = NULL,
        greenn_product_id = NULL,
        greenn_contract_id = NULL,
        last_credit_reset_at = now(),
        updated_at = now()
    WHERE user_id = sub.user_id;

    -- Reset credits to 100 (free renewal amount, not 300)
    PERFORM reset_upscaler_credits(sub.user_id, 100, 'Plano expirado - resetado para Free (100 créditos)');

    expired_count := expired_count + 1;
  END LOOP;

  RETURN QUERY SELECT expired_count;
END;
$$;
