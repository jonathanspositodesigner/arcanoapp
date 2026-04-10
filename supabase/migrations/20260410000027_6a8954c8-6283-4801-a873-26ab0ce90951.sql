CREATE OR REPLACE FUNCTION public.consume_upscaler_credits(
  _user_id uuid,
  _amount integer,
  _description text DEFAULT NULL
)
RETURNS TABLE(success boolean, new_balance integer, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  _is_unlimited := is_unlimited_subscriber(_user_id);

  IF _is_unlimited AND (_description IS NULL OR _description NOT LIKE '%Veo 3.1%') THEN
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

  total_balance := current_monthly + current_lifetime;

  IF total_balance < _amount THEN
    RETURN QUERY SELECT FALSE, total_balance, 'Saldo insuficiente'::TEXT;
    RETURN;
  END IF;

  IF current_monthly >= _amount THEN
    monthly_to_consume := _amount;
    lifetime_to_consume := 0;
    tx_credit_type := 'monthly';
  ELSIF current_monthly > 0 THEN
    monthly_to_consume := current_monthly;
    lifetime_to_consume := _amount - current_monthly;
    tx_credit_type := 'mixed';
  ELSE
    monthly_to_consume := 0;
    lifetime_to_consume := _amount;
    tx_credit_type := 'lifetime';
  END IF;

  updated_monthly := current_monthly - monthly_to_consume;
  updated_lifetime := current_lifetime - lifetime_to_consume;
  updated_balance := updated_monthly + updated_lifetime;

  UPDATE upscaler_credits
  SET monthly_balance = updated_monthly,
      lifetime_balance = updated_lifetime,
      balance = updated_balance,
      updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO upscaler_credit_transactions (
    user_id,
    amount,
    balance_after,
    transaction_type,
    description,
    credit_type
  )
  VALUES (
    _user_id,
    -_amount,
    updated_balance,
    'consumption',
    COALESCE(_description, 'AI Tool'),
    tx_credit_type
  );

  RETURN QUERY SELECT TRUE, updated_balance, NULL::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_upscaler_credits(
  _user_id uuid,
  _amount integer,
  _description text DEFAULT 'Refund'::text
)
RETURNS TABLE(success boolean, new_balance integer, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_monthly_balance INTEGER;
  v_lifetime_balance INTEGER;
  v_new_lifetime_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() != _user_id THEN
    RETURN QUERY SELECT FALSE, 0, 'Access denied: cannot refund another user credits'::TEXT;
    RETURN;
  END IF;

  IF _amount <= 0 OR _amount > 10000 THEN
    RETURN QUERY SELECT FALSE, 0, 'Invalid amount'::TEXT;
    RETURN;
  END IF;

  INSERT INTO upscaler_credits (user_id, balance, monthly_balance, lifetime_balance)
  VALUES (_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT COALESCE(monthly_balance, 0), COALESCE(lifetime_balance, 0)
  INTO v_monthly_balance, v_lifetime_balance
  FROM upscaler_credits
  WHERE user_id = _user_id
  FOR UPDATE;

  v_new_lifetime_balance := v_lifetime_balance + _amount;
  v_new_balance := v_monthly_balance + v_new_lifetime_balance;

  UPDATE upscaler_credits
  SET lifetime_balance = v_new_lifetime_balance,
      balance = v_new_balance,
      updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO upscaler_credit_transactions (
    user_id,
    amount,
    balance_after,
    transaction_type,
    credit_type,
    description
  )
  VALUES (
    _user_id,
    _amount,
    v_new_balance,
    'refund',
    'lifetime',
    COALESCE(_description, 'Refund')
  );

  RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
END;
$$;