
CREATE OR REPLACE FUNCTION public.process_referral(p_referred_user_id uuid, p_referral_code text)
 RETURNS TABLE(success boolean, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer_id UUID;
  v_referrer_balance INTEGER;
  v_referred_balance INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_referred_user_id::text));

  SELECT user_id INTO v_referrer_id FROM referral_codes WHERE code = p_referral_code;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Código de indicação inválido'::TEXT;
    RETURN;
  END IF;

  IF v_referrer_id = p_referred_user_id THEN
    RETURN QUERY SELECT FALSE, 'Não é possível usar seu próprio código'::TEXT;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM referrals WHERE referred_id = p_referred_user_id) THEN
    RETURN QUERY SELECT FALSE, 'Usuário já foi indicado anteriormente'::TEXT;
    RETURN;
  END IF;

  -- Add 300 lifetime credits to referred user
  INSERT INTO upscaler_credits (user_id, balance, monthly_balance, lifetime_balance)
  VALUES (p_referred_user_id, 300, 0, 300)
  ON CONFLICT (user_id) DO UPDATE SET
    lifetime_balance = upscaler_credits.lifetime_balance + 300,
    balance = upscaler_credits.monthly_balance + upscaler_credits.lifetime_balance + 300,
    updated_at = now();

  SELECT monthly_balance + lifetime_balance INTO v_referred_balance
  FROM upscaler_credits WHERE user_id = p_referred_user_id;

  INSERT INTO upscaler_credit_transactions (user_id, amount, balance_after, transaction_type, description, credit_type)
  VALUES (p_referred_user_id, 300, v_referred_balance, 'bonus', 'Bônus de indicação: 300 créditos vitalícios', 'lifetime');

  -- Add 300 lifetime credits to referrer (changed from 150 to 300)
  INSERT INTO upscaler_credits (user_id, balance, monthly_balance, lifetime_balance)
  VALUES (v_referrer_id, 300, 0, 300)
  ON CONFLICT (user_id) DO UPDATE SET
    lifetime_balance = upscaler_credits.lifetime_balance + 300,
    balance = upscaler_credits.monthly_balance + upscaler_credits.lifetime_balance + 300,
    updated_at = now();

  SELECT monthly_balance + lifetime_balance INTO v_referrer_balance
  FROM upscaler_credits WHERE user_id = v_referrer_id;

  INSERT INTO upscaler_credit_transactions (user_id, amount, balance_after, transaction_type, description, credit_type)
  VALUES (v_referrer_id, 300, v_referrer_balance, 'bonus', 'Bônus de indicação: 300 créditos vitalícios (indicou um amigo)', 'lifetime');

  INSERT INTO referrals (referrer_id, referred_id, referral_code)
  VALUES (v_referrer_id, p_referred_user_id, p_referral_code);

  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$function$;
