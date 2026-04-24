CREATE OR REPLACE FUNCTION public.consume_upscaler_credits(_user_id uuid, _amount integer, _description text DEFAULT NULL::text)
 RETURNS TABLE(success boolean, remaining_balance integer, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_monthly INTEGER;
  current_lifetime INTEGER;
  total_balance INTEGER;
  monthly_to_consume INTEGER;
  lifetime_to_consume INTEGER;
  updated_monthly INTEGER;
  updated_lifetime INTEGER;
  updated_balance INTEGER;
  _is_unlimited BOOLEAN;
  _has_active_sub BOOLEAN;
  tx_credit_type TEXT;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() != _user_id THEN
    RETURN QUERY SELECT FALSE, 0, 'Access denied: cannot consume another user credits'::TEXT;
    RETURN;
  END IF;

  IF _amount <= 0 OR _amount > 10000 THEN
    RETURN QUERY SELECT FALSE, 0, 'Invalid amount'::TEXT;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM planos2_subscriptions
    WHERE user_id = _user_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO _has_active_sub;

  _is_unlimited := is_unlimited_subscriber(_user_id);

  -- Unlimited bypass: skip charging only for tools that are part of the unlimited plan.
  -- Excluded (always charged even for unlimited): Veo 3.1 and Kling 2.5 Turbo (MovieLed Maker)
  IF _is_unlimited
     AND (_description IS NULL
          OR (_description NOT LIKE '%Veo 3.1%'
              AND _description NOT LIKE '%Kling 2.5%')) THEN
    SELECT COALESCE(monthly_balance, 0), COALESCE(lifetime_balance, 0)
    INTO current_monthly, current_lifetime
    FROM upscaler_credits
    WHERE user_id = _user_id;

    total_balance := COALESCE(current_monthly, 0) + COALESCE(current_lifetime, 0);
    RETURN QUERY SELECT TRUE, total_balance, NULL::TEXT;
    RETURN;
  END IF;

  INSERT INTO upscaler_credits (user_id, balance, monthly_balance, lifetime_balance)
  VALUES (_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT COALESCE(uc.monthly_balance, 0), COALESCE(uc.lifetime_balance, 0)
  INTO current_monthly, current_lifetime
  FROM upscaler_credits uc
  WHERE uc.user_id = _user_id
  FOR UPDATE;

  -- CRITICAL FIX: If subscription expired, zero monthly credits immediately
  IF NOT _has_active_sub AND EXISTS (
    SELECT 1 FROM planos2_subscriptions WHERE user_id = _user_id
  ) THEN
    IF current_monthly > 0 THEN
      UPDATE upscaler_credits
      SET monthly_balance = 0,
          balance = lifetime_balance,
          updated_at = now()
      WHERE user_id = _user_id;
      current_monthly := 0;
    END IF;
  END IF;

  total_balance := current_monthly + current_lifetime;

  IF total_balance < _amount THEN
    RETURN QUERY SELECT FALSE, total_balance, 'Saldo insuficiente'::TEXT;
    RETURN;
  END IF;

  monthly_to_consume := LEAST(current_monthly, _amount);
  lifetime_to_consume := _amount - monthly_to_consume;

  updated_monthly := current_monthly - monthly_to_consume;
  updated_lifetime := current_lifetime - lifetime_to_consume;
  updated_balance := updated_monthly + updated_lifetime;

  UPDATE upscaler_credits
  SET monthly_balance = updated_monthly,
      lifetime_balance = updated_lifetime,
      balance = updated_balance,
      updated_at = now()
  WHERE user_id = _user_id;

  IF monthly_to_consume > 0 AND lifetime_to_consume > 0 THEN
    tx_credit_type := 'mixed';
  ELSIF monthly_to_consume > 0 THEN
    tx_credit_type := 'monthly';
  ELSE
    tx_credit_type := 'lifetime';
  END IF;

  INSERT INTO upscaler_credit_transactions (user_id, amount, transaction_type, description, balance_after, credit_type)
  VALUES (_user_id, -_amount, 'consumption', COALESCE(_description, 'Credit consumption'), updated_balance, tx_credit_type);

  RETURN QUERY SELECT TRUE, updated_balance, NULL::TEXT;
END;
$function$;