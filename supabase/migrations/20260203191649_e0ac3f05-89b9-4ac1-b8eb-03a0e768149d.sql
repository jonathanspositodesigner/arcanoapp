-- Remove monthly credits (admin only)
CREATE OR REPLACE FUNCTION public.remove_monthly_credits(_user_id uuid, _amount integer, _description text DEFAULT 'Manual adjustment - Admin')
RETURNS TABLE(success boolean, new_balance integer, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_monthly INTEGER;
  current_lifetime INTEGER;
  updated_balance INTEGER;
BEGIN
  -- Security check: only admins can remove credits
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT FALSE, 0, 'Access denied: admin role required'::TEXT;
    RETURN;
  END IF;

  -- Validate amount is positive and reasonable
  IF _amount <= 0 OR _amount > 100000 THEN
    RETURN QUERY SELECT FALSE, 0, 'Invalid amount'::TEXT;
    RETURN;
  END IF;

  -- Get current balances
  SELECT monthly_balance, lifetime_balance INTO current_monthly, current_lifetime
  FROM upscaler_credits
  WHERE user_id = _user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'User not found'::TEXT;
    RETURN;
  END IF;

  IF current_monthly < _amount THEN
    RETURN QUERY SELECT FALSE, current_monthly + current_lifetime, 'Insufficient monthly balance'::TEXT;
    RETURN;
  END IF;

  -- Update monthly credits
  UPDATE upscaler_credits
  SET 
    monthly_balance = monthly_balance - _amount,
    balance = (monthly_balance - _amount) + lifetime_balance,
    updated_at = now()
  WHERE user_id = _user_id
  RETURNING monthly_balance + lifetime_balance INTO updated_balance;

  -- Log the transaction
  INSERT INTO upscaler_credit_transactions 
    (user_id, amount, balance_after, transaction_type, description, credit_type)
  VALUES 
    (_user_id, -_amount, updated_balance, 'admin_adjustment', _description, 'monthly');

  RETURN QUERY SELECT TRUE, updated_balance, NULL::TEXT;
END;
$$;

-- Remove lifetime credits (admin only)
CREATE OR REPLACE FUNCTION public.remove_lifetime_credits(_user_id uuid, _amount integer, _description text DEFAULT 'Manual adjustment - Admin')
RETURNS TABLE(success boolean, new_balance integer, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_monthly INTEGER;
  current_lifetime INTEGER;
  updated_balance INTEGER;
BEGIN
  -- Security check: only admins can remove credits
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT FALSE, 0, 'Access denied: admin role required'::TEXT;
    RETURN;
  END IF;

  -- Validate amount is positive and reasonable
  IF _amount <= 0 OR _amount > 100000 THEN
    RETURN QUERY SELECT FALSE, 0, 'Invalid amount'::TEXT;
    RETURN;
  END IF;

  -- Get current balances
  SELECT monthly_balance, lifetime_balance INTO current_monthly, current_lifetime
  FROM upscaler_credits
  WHERE user_id = _user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'User not found'::TEXT;
    RETURN;
  END IF;

  IF current_lifetime < _amount THEN
    RETURN QUERY SELECT FALSE, current_monthly + current_lifetime, 'Insufficient lifetime balance'::TEXT;
    RETURN;
  END IF;

  -- Update lifetime credits
  UPDATE upscaler_credits
  SET 
    lifetime_balance = lifetime_balance - _amount,
    balance = monthly_balance + (lifetime_balance - _amount),
    updated_at = now()
  WHERE user_id = _user_id
  RETURNING monthly_balance + lifetime_balance INTO updated_balance;

  -- Log the transaction
  INSERT INTO upscaler_credit_transactions 
    (user_id, amount, balance_after, transaction_type, description, credit_type)
  VALUES 
    (_user_id, -_amount, updated_balance, 'admin_adjustment', _description, 'lifetime');

  RETURN QUERY SELECT TRUE, updated_balance, NULL::TEXT;
END;
$$;

-- Function to get all users with credits for admin panel
CREATE OR REPLACE FUNCTION public.get_all_credit_users()
RETURNS TABLE(
  user_id uuid,
  email text,
  name text,
  monthly_balance integer,
  lifetime_balance integer,
  total_balance integer,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Security check: only admins can view all credit users
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    uc.user_id,
    COALESCE(p.email, 'N/A') as email,
    COALESCE(p.name, 'N/A') as name,
    uc.monthly_balance,
    uc.lifetime_balance,
    uc.monthly_balance + uc.lifetime_balance as total_balance,
    uc.updated_at
  FROM upscaler_credits uc
  LEFT JOIN profiles p ON p.id = uc.user_id
  WHERE uc.monthly_balance > 0 OR uc.lifetime_balance > 0
  ORDER BY (uc.monthly_balance + uc.lifetime_balance) DESC;
END;
$$;