
-- Add FOR UPDATE row-level locking to reset_upscaler_credits
CREATE OR REPLACE FUNCTION public.reset_upscaler_credits(_user_id uuid, _amount integer, _description text DEFAULT 'Subscription credits reset'::text)
 RETURNS TABLE(success boolean, new_balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  updated_balance INTEGER;
  existing_lifetime INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required to reset credits';
  END IF;

  IF _amount < 0 OR _amount > 100000 THEN
    RAISE EXCEPTION 'Invalid credit amount';
  END IF;

  -- Lock the row first to prevent concurrent modifications
  SELECT lifetime_balance INTO existing_lifetime
  FROM upscaler_credits
  WHERE user_id = _user_id
  FOR UPDATE;

  IF FOUND THEN
    -- Row exists, update with lock held
    UPDATE upscaler_credits
    SET monthly_balance = _amount,
        balance = _amount + lifetime_balance,
        landing_trial_expires_at = NULL,
        updated_at = now()
    WHERE user_id = _user_id
    RETURNING monthly_balance + lifetime_balance INTO updated_balance;
  ELSE
    -- Row doesn't exist, insert
    INSERT INTO upscaler_credits (user_id, balance, monthly_balance, lifetime_balance, landing_trial_expires_at)
    VALUES (_user_id, _amount, _amount, 0, NULL)
    RETURNING monthly_balance + lifetime_balance INTO updated_balance;
  END IF;
  
  INSERT INTO upscaler_credit_transactions 
    (user_id, amount, balance_after, transaction_type, description, credit_type)
  VALUES 
    (_user_id, _amount, updated_balance, 'reset', _description, 'monthly');
  
  RETURN QUERY SELECT TRUE, updated_balance;
END;
$$;

-- Add FOR UPDATE row-level locking to add_lifetime_credits
CREATE OR REPLACE FUNCTION public.add_lifetime_credits(_user_id uuid, _amount integer, _description text DEFAULT 'Lifetime credit added'::text)
 RETURNS TABLE(success boolean, new_balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  updated_balance INTEGER;
  existing_monthly INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required to add lifetime credits';
  END IF;

  IF _amount <= 0 OR _amount > 100000 THEN
    RAISE EXCEPTION 'Invalid credit amount';
  END IF;

  -- Lock the row first to prevent concurrent modifications
  SELECT monthly_balance INTO existing_monthly
  FROM upscaler_credits
  WHERE user_id = _user_id
  FOR UPDATE;

  IF FOUND THEN
    -- Row exists, update with lock held
    UPDATE upscaler_credits
    SET lifetime_balance = lifetime_balance + _amount,
        balance = monthly_balance + lifetime_balance + _amount,
        updated_at = now()
    WHERE user_id = _user_id
    RETURNING monthly_balance + lifetime_balance INTO updated_balance;
  ELSE
    -- Row doesn't exist, insert
    INSERT INTO upscaler_credits (user_id, balance, monthly_balance, lifetime_balance)
    VALUES (_user_id, _amount, 0, _amount)
    RETURNING monthly_balance + lifetime_balance INTO updated_balance;
  END IF;
  
  INSERT INTO upscaler_credit_transactions 
    (user_id, amount, balance_after, transaction_type, description, credit_type)
  VALUES 
    (_user_id, _amount, updated_balance, 'credit', _description, 'lifetime');
  
  RETURN QUERY SELECT TRUE, updated_balance;
END;
$$;
