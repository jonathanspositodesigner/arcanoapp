
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
  _is_unlimited BOOLEAN;
BEGIN
  -- Security check: only allow consuming own credits or via service role
  IF auth.uid() IS NOT NULL AND auth.uid() != _user_id THEN
    RETURN QUERY SELECT FALSE, 0, 'Access denied: cannot consume another user credits'::TEXT;
    RETURN;
  END IF;

  -- Validate amount is positive and reasonable
  IF _amount <= 0 OR _amount > 10000 THEN
    RETURN QUERY SELECT FALSE, 0, 'Invalid amount'::TEXT;
    RETURN;
  END IF;

  -- Check if user is IA Unlimited subscriber
  _is_unlimited := is_unlimited_subscriber(_user_id);

  -- If unlimited AND tool is NOT Veo 3.1 → skip consumption, return current balance
  IF _is_unlimited AND (_description IS NULL OR _description NOT LIKE '%Veo 3.1%') THEN
    -- Get current balance without consuming
    SELECT monthly_balance, lifetime_balance INTO current_monthly, current_lifetime
    FROM upscaler_credits
    WHERE user_id = _user_id;

    total_balance := COALESCE(current_monthly, 0) + COALESCE(current_lifetime, 0);
    RETURN QUERY SELECT TRUE, total_balance, NULL::TEXT;
    RETURN;
  END IF;

  -- Get current balances (or create if not exists)
  INSERT INTO upscaler_credits (user_id, balance, monthly_balance, lifetime_balance)
  VALUES (_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT uc.monthly_balance, uc.lifetime_balance INTO current_monthly, current_lifetime
  FROM upscaler_credits uc
  WHERE uc.user_id = _user_id
  FOR UPDATE;
  
  total_balance := current_monthly + current_lifetime;
  
  IF total_balance < _amount THEN
    RETURN QUERY SELECT FALSE, total_balance, 'Saldo insuficiente'::TEXT;
    RETURN;
  END IF;
  
  -- Consume from monthly first, then lifetime
  IF current_monthly >= _amount THEN
    monthly_to_consume := _amount;
    lifetime_to_consume := 0;
  ELSE
    monthly_to_consume := current_monthly;
    lifetime_to_consume := _amount - current_monthly;
  END IF;
  
  updated_monthly := current_monthly - monthly_to_consume;
  updated_lifetime := current_lifetime - lifetime_to_consume;
  
  UPDATE upscaler_credits
  SET 
    monthly_balance = updated_monthly, 
    lifetime_balance = updated_lifetime,
    balance = updated_monthly + updated_lifetime,
    updated_at = now()
  WHERE user_id = _user_id;
  
  -- Log the transaction with credit_type info
  INSERT INTO upscaler_credit_transactions 
    (user_id, amount, balance_after, transaction_type, description, credit_type)
  VALUES 
    (_user_id, -_amount, updated_monthly + updated_lifetime, 'consumption', _description, 
     CASE WHEN lifetime_to_consume > 0 THEN 'mixed' ELSE 'monthly' END);
  
  RETURN QUERY SELECT TRUE, updated_monthly + updated_lifetime, NULL::TEXT;
END;
$$;
