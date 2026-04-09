
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
  -- Get subscription info
  SELECT plan_slug, nano_banana_usage_count, last_credit_reset_at
  INTO _sub
  FROM planos2_subscriptions
  WHERE user_id = _user_id AND is_active = true;

  -- If no subscription or not unlimited, allow nano banana normally
  IF _sub IS NULL OR _sub.plan_slug != 'unlimited' THEN
    RETURN jsonb_build_object('exceeded', false, 'count', 0);
  END IF;

  _count := COALESCE(_sub.nano_banana_usage_count, 0);
  _exceeded := _count >= 150;

  RETURN jsonb_build_object('exceeded', _exceeded, 'count', _count);
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_nano_banana_usage(
  _user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE planos2_subscriptions
  SET nano_banana_usage_count = COALESCE(nano_banana_usage_count, 0) + 1
  WHERE user_id = _user_id AND is_active = true;
END;
$$;
