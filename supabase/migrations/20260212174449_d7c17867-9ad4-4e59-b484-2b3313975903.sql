CREATE OR REPLACE FUNCTION claim_arcano_free_trial_atomic(p_user_id uuid, p_email text)
RETURNS TABLE(already_claimed boolean, credits_granted integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credit_cost integer;
  v_credits integer;
  v_balance_after integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_email));

  IF EXISTS (SELECT 1 FROM arcano_cloner_free_trials WHERE email = p_email) THEN
    RETURN QUERY SELECT true::boolean, 0::integer;
    RETURN;
  END IF;

  SELECT ats.credit_cost INTO v_credit_cost
  FROM ai_tool_settings ats
  WHERE ats.tool_name = 'arcano_cloner'
  LIMIT 1;

  v_credit_cost := COALESCE(v_credit_cost, 100);
  v_credits := v_credit_cost * 3;

  INSERT INTO arcano_cloner_free_trials (user_id, email, credits_granted)
  VALUES (p_user_id, p_email, v_credits);

  INSERT INTO upscaler_credits (user_id, monthly_balance, lifetime_balance, balance)
  VALUES (p_user_id, v_credits, 0, v_credits)
  ON CONFLICT (user_id) DO UPDATE
  SET monthly_balance = upscaler_credits.monthly_balance + v_credits,
      balance = upscaler_credits.balance + v_credits,
      updated_at = now();

  -- Fetch updated balance for audit trail
  SELECT balance INTO v_balance_after
  FROM upscaler_credits WHERE user_id = p_user_id;

  INSERT INTO upscaler_credit_transactions (user_id, amount, balance_after, transaction_type, credit_type, description)
  VALUES (p_user_id, v_credits, v_balance_after, 'bonus', 'monthly', '300 créditos grátis - Teste Grátis');

  RETURN QUERY SELECT false::boolean, v_credits::integer;
END;
$$;