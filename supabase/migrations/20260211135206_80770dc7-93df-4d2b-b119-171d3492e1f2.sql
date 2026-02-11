
CREATE OR REPLACE FUNCTION public.claim_arcano_free_trial_atomic(p_user_id UUID, p_email TEXT)
RETURNS TABLE(already_claimed BOOLEAN, credits_granted INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_credit_cost INTEGER;
  v_total_credits INTEGER;
  v_new_balance INTEGER;
  v_existing_claim_id UUID;
BEGIN
  -- 1. Lock check: try to find existing claim (SELECT FOR UPDATE style via unique constraint)
  SELECT id INTO v_existing_claim_id 
  FROM arcano_cloner_free_trials 
  WHERE email = p_email
  LIMIT 1;

  IF v_existing_claim_id IS NOT NULL THEN
    RETURN QUERY SELECT TRUE, 0;
    RETURN;
  END IF;

  -- 2. Insert claim FIRST (uses unique constraint on email to prevent duplicates atomically)
  BEGIN
    INSERT INTO arcano_cloner_free_trials (user_id, email, credits_granted)
    VALUES (p_user_id, p_email, 0);
  EXCEPTION WHEN unique_violation THEN
    -- Another concurrent request already inserted
    RETURN QUERY SELECT TRUE, 0;
    RETURN;
  END;

  -- 3. Get credit cost from settings
  SELECT credit_cost INTO v_credit_cost
  FROM ai_tool_settings
  WHERE tool_name = 'Arcano Cloner'
  LIMIT 1;

  v_credit_cost := COALESCE(v_credit_cost, 80);
  v_total_credits := 3 * v_credit_cost;

  -- 4. Update the claim record with actual credits
  UPDATE arcano_cloner_free_trials 
  SET credits_granted = v_total_credits
  WHERE user_id = p_user_id AND email = p_email;

  -- 5. Upsert credits
  INSERT INTO upscaler_credits (user_id, balance, monthly_balance, lifetime_balance)
  VALUES (p_user_id, v_total_credits, v_total_credits, 0)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    monthly_balance = upscaler_credits.monthly_balance + v_total_credits,
    balance = upscaler_credits.monthly_balance + v_total_credits + upscaler_credits.lifetime_balance,
    updated_at = now()
  RETURNING balance INTO v_new_balance;

  -- 6. Record transaction
  INSERT INTO upscaler_credit_transactions 
    (user_id, amount, balance_after, transaction_type, description, credit_type)
  VALUES 
    (p_user_id, v_total_credits, v_new_balance, 'arcano_free_trial', 
     'Bônus: 3 gerações gratuitas no Arcano Cloner (' || v_total_credits || ' créditos)', 'monthly');

  RETURN QUERY SELECT FALSE, v_total_credits;
END;
$$;
