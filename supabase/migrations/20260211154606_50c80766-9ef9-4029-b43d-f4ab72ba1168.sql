
CREATE OR REPLACE FUNCTION public.revoke_credits_on_refund(
  _user_id UUID,
  _amount INT,
  _description TEXT DEFAULT 'Reembolso'
)
RETURNS TABLE(success BOOLEAN, new_balance INT, amount_revoked INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_lifetime INT;
  v_revoke_amount INT;
  v_new_balance INT;
BEGIN
  -- Get current lifetime balance
  SELECT COALESCE(lifetime_balance, 0) INTO v_current_lifetime
  FROM upscaler_credits
  WHERE user_id = _user_id;

  -- If user has no credits record, nothing to revoke
  IF NOT FOUND OR v_current_lifetime <= 0 THEN
    RETURN QUERY SELECT true, 0, 0;
    RETURN;
  END IF;

  -- Revoke min(amount, current balance) to avoid negative
  v_revoke_amount := LEAST(_amount, v_current_lifetime);
  v_new_balance := v_current_lifetime - v_revoke_amount;

  -- Update lifetime balance
  UPDATE upscaler_credits
  SET lifetime_balance = v_new_balance,
      balance = monthly_balance + v_new_balance,
      updated_at = now()
  WHERE user_id = _user_id;

  -- Log the refund transaction
  INSERT INTO upscaler_credit_transactions (
    user_id, amount, transaction_type, credit_type, description
  ) VALUES (
    _user_id, v_revoke_amount, 'refund', 'lifetime', _description
  );

  RETURN QUERY SELECT true, v_new_balance, v_revoke_amount;
END;
$$;
