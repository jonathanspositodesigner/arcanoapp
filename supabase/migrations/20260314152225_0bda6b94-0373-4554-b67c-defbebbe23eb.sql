
-- 1) FIX: expire_landing_trial_credits - safe, idempotent, won't hurt paid users
CREATE OR REPLACE FUNCTION public.expire_landing_trial_credits(_user_id uuid)
 RETURNS TABLE(was_expired boolean, new_balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_expires_at TIMESTAMPTZ;
  v_monthly INTEGER;
  v_lifetime INTEGER;
  v_updated_balance INTEGER;
  v_has_paid_sub BOOLEAN;
BEGIN
  SELECT landing_trial_expires_at, monthly_balance, lifetime_balance
  INTO v_expires_at, v_monthly, v_lifetime
  FROM upscaler_credits
  WHERE user_id = _user_id
  FOR UPDATE;

  -- No record or no trial flag → nothing to do
  IF NOT FOUND OR v_expires_at IS NULL THEN
    RETURN QUERY SELECT false::boolean, COALESCE(v_monthly + v_lifetime, 0)::integer;
    RETURN;
  END IF;

  -- Trial hasn't expired yet → nothing to do
  IF v_expires_at > now() THEN
    RETURN QUERY SELECT false::boolean, (v_monthly + v_lifetime)::integer;
    RETURN;
  END IF;

  -- Check if user has an active PAID subscription (planos2 or legacy premium)
  SELECT EXISTS (
    SELECT 1 FROM planos2_subscriptions
    WHERE user_id = _user_id AND is_active = true AND plan_slug != 'free'
    AND (expires_at IS NULL OR expires_at > now())
  ) OR EXISTS (
    SELECT 1 FROM premium_users
    WHERE user_id = _user_id AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_has_paid_sub;

  IF v_has_paid_sub THEN
    -- Paid user: just clear the stale trial flag, do NOT touch credits
    UPDATE upscaler_credits
    SET landing_trial_expires_at = NULL, updated_at = now()
    WHERE user_id = _user_id;

    RETURN QUERY SELECT false::boolean, (v_monthly + v_lifetime)::integer;
    RETURN;
  END IF;

  -- Real trial user with expired trial: zero out monthly and clear flag
  IF v_monthly > 0 THEN
    UPDATE upscaler_credits
    SET monthly_balance = 0,
        balance = lifetime_balance,
        landing_trial_expires_at = NULL,
        updated_at = now()
    WHERE user_id = _user_id;

    INSERT INTO upscaler_credit_transactions (user_id, amount, balance_after, transaction_type, description, credit_type)
    VALUES (_user_id, -v_monthly, v_lifetime, 'consumption', 'Créditos de teste expirados (24h)', 'monthly');
  ELSE
    -- monthly is already 0, just clear flag
    UPDATE upscaler_credits
    SET landing_trial_expires_at = NULL, updated_at = now()
    WHERE user_id = _user_id;
  END IF;

  RETURN QUERY SELECT true::boolean, v_lifetime::integer;
END;
$function$;

-- 2) FIX: reset_upscaler_credits - clear trial flag on subscription reset
CREATE OR REPLACE FUNCTION public.reset_upscaler_credits(_user_id uuid, _amount integer, _description text DEFAULT 'Subscription credits reset'::text)
 RETURNS TABLE(success boolean, new_balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  updated_balance INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required to reset credits';
  END IF;

  IF _amount < 0 OR _amount > 100000 THEN
    RAISE EXCEPTION 'Invalid credit amount';
  END IF;

  INSERT INTO upscaler_credits (user_id, balance, monthly_balance, lifetime_balance, landing_trial_expires_at)
  VALUES (_user_id, _amount, _amount, 0, NULL)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    monthly_balance = _amount, 
    balance = _amount + upscaler_credits.lifetime_balance,
    landing_trial_expires_at = NULL,
    updated_at = now()
  RETURNING monthly_balance + lifetime_balance INTO updated_balance;
  
  INSERT INTO upscaler_credit_transactions 
    (user_id, amount, balance_after, transaction_type, description, credit_type)
  VALUES 
    (_user_id, _amount, updated_balance, 'reset', _description, 'monthly');
  
  RETURN QUERY SELECT TRUE, updated_balance;
END;
$function$;

-- 3) FIX: add_upscaler_credits - clear trial flag when admin adds credits
CREATE OR REPLACE FUNCTION public.add_upscaler_credits(_user_id uuid, _amount integer, _description text DEFAULT 'Credit added'::text)
 RETURNS TABLE(success boolean, new_balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  updated_balance INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required to add credits';
  END IF;

  IF _amount <= 0 OR _amount > 100000 THEN
    RAISE EXCEPTION 'Invalid credit amount';
  END IF;

  INSERT INTO upscaler_credits (user_id, balance, monthly_balance, lifetime_balance, landing_trial_expires_at)
  VALUES (_user_id, _amount, _amount, 0, NULL)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    monthly_balance = upscaler_credits.monthly_balance + _amount,
    balance = upscaler_credits.monthly_balance + _amount + upscaler_credits.lifetime_balance,
    landing_trial_expires_at = NULL,
    updated_at = now()
  RETURNING monthly_balance + lifetime_balance INTO updated_balance;
  
  INSERT INTO upscaler_credit_transactions 
    (user_id, amount, balance_after, transaction_type, description, credit_type)
  VALUES 
    (_user_id, _amount, updated_balance, 'credit', _description, 'monthly');
  
  RETURN QUERY SELECT TRUE, updated_balance;
END;
$function$;
