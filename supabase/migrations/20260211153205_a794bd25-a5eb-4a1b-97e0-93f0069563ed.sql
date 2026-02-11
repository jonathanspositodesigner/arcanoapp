
CREATE OR REPLACE FUNCTION public.claim_arcano_free_trial_atomic(p_user_id uuid, p_email text)
 RETURNS TABLE(already_claimed boolean, credits_granted integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_credit_cost INTEGER;
  v_total_credits INTEGER;
  v_new_balance INTEGER;
  v_existing_claim_id UUID;
BEGIN
  -- Advisory lock based on email hash to prevent concurrent claims
  PERFORM pg_advisory_xact_lock(hashtext(p_email));

  -- Check existing claim
  SELECT id INTO v_existing_claim_id 
  FROM arcano_cloner_free_trials 
  WHERE email = p_email
  LIMIT 1;

  IF v_existing_claim_id IS NOT NULL THEN
    RETURN QUERY SELECT TRUE, 0;
    RETURN;
  END IF;

  -- Insert claim (unique constraint as secondary protection)
  BEGIN
    INSERT INTO arcano_cloner_free_trials (user_id, email, credits_granted)
    VALUES (p_user_id, p_email, 0);
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT TRUE, 0;
    RETURN;
  END;

  -- Get credit cost from settings
  SELECT credit_cost INTO v_credit_cost
  FROM ai_tool_settings
  WHERE tool_name = 'Arcano Cloner'
  LIMIT 1;

  v_credit_cost := COALESCE(v_credit_cost, 80);
  v_total_credits := 3 * v_credit_cost;

  -- Update claim record
  UPDATE arcano_cloner_free_trials 
  SET credits_granted = v_total_credits
  WHERE user_id = p_user_id AND email = p_email;

  -- Upsert credits
  INSERT INTO upscaler_credits (user_id, balance, monthly_balance, lifetime_balance)
  VALUES (p_user_id, v_total_credits, v_total_credits, 0)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    monthly_balance = upscaler_credits.monthly_balance + v_total_credits,
    balance = upscaler_credits.monthly_balance + v_total_credits + upscaler_credits.lifetime_balance,
    updated_at = now()
  RETURNING balance INTO v_new_balance;

  -- Record transaction
  INSERT INTO upscaler_credit_transactions 
    (user_id, amount, balance_after, transaction_type, description, credit_type)
  VALUES 
    (p_user_id, v_total_credits, v_new_balance, 'arcano_free_trial', 
     'Bônus: 3 gerações gratuitas no Arcano Cloner (' || v_total_credits || ' créditos)', 'monthly');

  RETURN QUERY SELECT FALSE, v_total_credits;
END;
$function$;
