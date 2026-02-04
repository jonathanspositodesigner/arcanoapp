-- Create refund_upscaler_credits function for returning credits when queue jobs are cancelled
CREATE OR REPLACE FUNCTION public.refund_upscaler_credits(
  _user_id UUID,
  _amount INTEGER,
  _description TEXT DEFAULT 'Refund'
)
RETURNS TABLE(
  success BOOLEAN,
  new_balance INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INTEGER;
  v_lifetime_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT balance, lifetime_balance INTO v_current_balance, v_lifetime_balance
  FROM upscaler_credits
  WHERE user_id = _user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'User credits not found'::TEXT;
    RETURN;
  END IF;
  
  -- Add refund to balance
  v_new_balance := v_current_balance + _amount;
  
  -- Update balance (refund goes to lifetime balance since we can't determine source)
  UPDATE upscaler_credits
  SET 
    balance = v_new_balance,
    lifetime_balance = lifetime_balance + _amount,
    updated_at = NOW()
  WHERE user_id = _user_id;
  
  -- Log the transaction
  INSERT INTO upscaler_credit_transactions (
    user_id,
    transaction_type,
    credit_type,
    amount,
    balance_after,
    description
  ) VALUES (
    _user_id,
    'refund',
    'lifetime',
    _amount,
    v_new_balance,
    _description
  );
  
  RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
END;
$$;