
CREATE OR REPLACE FUNCTION public.revoke_lifetime_credits_on_refund(
  _user_id uuid,
  _amount integer,
  _description text DEFAULT 'Reembolso - créditos revogados'::text
)
RETURNS TABLE(success boolean, amount_revoked integer, new_balance integer, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_monthly INTEGER;
  current_lifetime INTEGER;
  actual_revoke INTEGER;
  updated_balance INTEGER;
BEGIN
  -- Allow execution by service_role (auth.uid() IS NULL) OR admin
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'Access denied: admin or service role required'::TEXT;
    RETURN;
  END IF;

  -- Validate amount
  IF _amount <= 0 OR _amount > 100000 THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'Invalid amount'::TEXT;
    RETURN;
  END IF;

  -- Get current balances with row lock
  SELECT monthly_balance, lifetime_balance INTO current_monthly, current_lifetime
  FROM upscaler_credits
  WHERE user_id = _user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'User credits not found'::TEXT;
    RETURN;
  END IF;

  -- Revoke up to available lifetime balance (never go negative)
  actual_revoke := LEAST(_amount, current_lifetime);

  IF actual_revoke <= 0 THEN
    RETURN QUERY SELECT FALSE, 0, (current_monthly + current_lifetime)::INTEGER, 'No lifetime credits to revoke'::TEXT;
    RETURN;
  END IF;

  -- Update lifetime credits
  UPDATE upscaler_credits
  SET 
    lifetime_balance = lifetime_balance - actual_revoke,
    balance = monthly_balance + (lifetime_balance - actual_revoke),
    updated_at = now()
  WHERE user_id = _user_id
  RETURNING monthly_balance + lifetime_balance INTO updated_balance;

  -- Log the transaction with negative amount
  INSERT INTO upscaler_credit_transactions 
    (user_id, amount, balance_after, transaction_type, description, credit_type)
  VALUES 
    (_user_id, -actual_revoke, updated_balance, 'refund', _description, 'lifetime');

  RETURN QUERY SELECT TRUE, actual_revoke, updated_balance, NULL::TEXT;
END;
$$;
