
-- Adicionar coluna cost_multiplier na tabela planos2_subscriptions
ALTER TABLE public.planos2_subscriptions ADD COLUMN IF NOT EXISTS cost_multiplier NUMERIC DEFAULT 1.0;

-- Criar RPC para expirar assinaturas vencidas
CREATE OR REPLACE FUNCTION public.expire_planos2_subscriptions()
RETURNS TABLE(users_expired integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    -- Reset subscription to free
    UPDATE planos2_subscriptions
    SET plan_slug = 'free',
        credits_per_month = 300,
        daily_prompt_limit = NULL,
        has_image_generation = false,
        has_video_generation = false,
        cost_multiplier = 1.0,
        expires_at = NULL,
        greenn_product_id = NULL,
        greenn_contract_id = NULL,
        updated_at = now()
    WHERE user_id = sub.user_id;

    -- Reset credits to 300
    PERFORM reset_upscaler_credits(sub.user_id, 300, 'Plano expirado - resetado para Free');

    expired_count := expired_count + 1;
  END LOOP;

  RETURN QUERY SELECT expired_count;
END;
$function$;
