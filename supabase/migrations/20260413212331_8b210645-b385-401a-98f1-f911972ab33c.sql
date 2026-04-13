
CREATE OR REPLACE FUNCTION public.refund_upscaler_credits(
  _user_id UUID,
  _amount INTEGER,
  _description TEXT DEFAULT 'Refund'
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_monthly_balance INTEGER;
  v_lifetime_balance INTEGER;
  v_refund_to_monthly INTEGER;
  v_refund_to_lifetime INTEGER;
  v_new_monthly INTEGER;
  v_new_lifetime INTEGER;
  v_new_balance INTEGER;
  v_credit_type TEXT;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() != _user_id THEN
    RETURN QUERY SELECT FALSE, 0, 'Access denied: cannot refund another user credits'::TEXT;
    RETURN;
  END IF;

  IF _amount <= 0 OR _amount > 100000 THEN
    RETURN QUERY SELECT FALSE, 0, 'Invalid amount'::TEXT;
    RETURN;
  END IF;

  -- Ensure user has a credits record
  INSERT INTO upscaler_credits (user_id, balance, monthly_balance, lifetime_balance)
  VALUES (_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock the row
  SELECT COALESCE(monthly_balance, 0), COALESCE(lifetime_balance, 0)
  INTO v_monthly_balance, v_lifetime_balance
  FROM upscaler_credits
  WHERE user_id = _user_id
  FOR UPDATE;

  -- Refund goes to monthly first (mirrors consumption which takes from monthly first)
  v_refund_to_monthly := _amount;
  v_refund_to_lifetime := 0;

  v_new_monthly := v_monthly_balance + v_refund_to_monthly;
  v_new_lifetime := v_lifetime_balance + v_refund_to_lifetime;
  v_new_balance := v_new_monthly + v_new_lifetime;
  v_credit_type := 'monthly';

  UPDATE upscaler_credits
  SET monthly_balance = v_new_monthly,
      lifetime_balance = v_new_lifetime,
      balance = v_new_balance,
      updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO upscaler_credit_transactions (
    user_id, amount, balance_after, transaction_type, credit_type, description
  ) VALUES (
    _user_id, _amount, v_new_balance, 'refund', v_credit_type, COALESCE(_description, 'Refund')
  );

  RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
END;
$$;
