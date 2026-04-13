-- Function to auto-deactivate expired subscriptions and zero monthly credits
CREATE OR REPLACE FUNCTION public.deactivate_expired_subscriptions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_users uuid[];
  users_count int;
BEGIN
  -- Get users with expired active subscriptions
  SELECT array_agg(user_id) INTO affected_users
  FROM planos2_subscriptions
  WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at < now();

  IF affected_users IS NULL OR array_length(affected_users, 1) IS NULL THEN
    RETURN jsonb_build_object('deactivated', 0);
  END IF;

  users_count := array_length(affected_users, 1);

  -- Deactivate expired subscriptions
  UPDATE planos2_subscriptions
  SET is_active = false
  WHERE user_id = ANY(affected_users)
    AND is_active = true
    AND expires_at IS NOT NULL
    AND expires_at < now();

  -- Zero out monthly balance for affected users
  UPDATE upscaler_credits
  SET monthly_balance = 0,
      balance = lifetime_balance
  WHERE user_id = ANY(affected_users)
    AND monthly_balance > 0;

  RETURN jsonb_build_object('deactivated', users_count);
END;
$$;