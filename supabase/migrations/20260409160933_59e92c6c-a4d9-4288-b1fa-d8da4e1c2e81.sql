
ALTER TABLE public.planos2_subscriptions ADD COLUMN IF NOT EXISTS nano_banana_reset_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.check_nano_banana_limit(
  _user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sub RECORD;
  _exceeded boolean := false;
  _count integer := 0;
BEGIN
  SELECT plan_slug, nano_banana_usage_count, last_credit_reset_at, nano_banana_reset_at
  INTO _sub
  FROM planos2_subscriptions
  WHERE user_id = _user_id AND is_active = true;

  IF _sub IS NULL OR _sub.plan_slug != 'unlimited' THEN
    RETURN jsonb_build_object('exceeded', false, 'count', 0);
  END IF;

  -- Auto-reset if billing cycle renewed since last nano banana reset
  IF _sub.last_credit_reset_at > _sub.nano_banana_reset_at THEN
    UPDATE planos2_subscriptions
    SET nano_banana_usage_count = 0, nano_banana_reset_at = now()
    WHERE user_id = _user_id AND is_active = true;
    RETURN jsonb_build_object('exceeded', false, 'count', 0);
  END IF;

  _count := COALESCE(_sub.nano_banana_usage_count, 0);
  _exceeded := _count >= 150;

  RETURN jsonb_build_object('exceeded', _exceeded, 'count', _count);
END;
$$;
