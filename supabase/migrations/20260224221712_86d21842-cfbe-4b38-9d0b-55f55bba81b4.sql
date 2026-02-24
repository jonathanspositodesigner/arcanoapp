
-- Table: referral_codes
CREATE TABLE public.referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: referrals
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  credits_given_referrer INTEGER NOT NULL DEFAULT 150,
  credits_given_referred INTEGER NOT NULL DEFAULT 300,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own referral code"
  ON public.referral_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own referrals as referrer"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Users can read own referrals as referred"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referred_id);

-- RPC: get_or_create_referral_code
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code TEXT;
  v_attempts INTEGER := 0;
BEGIN
  -- Only allow user to get their own code
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Check if code already exists
  SELECT code INTO v_code FROM referral_codes WHERE user_id = p_user_id;
  IF FOUND THEN
    RETURN v_code;
  END IF;

  -- Generate unique code
  LOOP
    v_code := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
    BEGIN
      INSERT INTO referral_codes (user_id, code) VALUES (p_user_id, v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts > 10 THEN
        RAISE EXCEPTION 'Could not generate unique referral code';
      END IF;
    END;
  END LOOP;
END;
$$;

-- RPC: process_referral
CREATE OR REPLACE FUNCTION public.process_referral(p_referred_user_id UUID, p_referral_code TEXT)
RETURNS TABLE(success BOOLEAN, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referrer_id UUID;
  v_referrer_balance INTEGER;
  v_referred_balance INTEGER;
BEGIN
  -- Advisory lock on the referred user to prevent duplicates
  PERFORM pg_advisory_xact_lock(hashtext(p_referred_user_id::text));

  -- Validate referral code exists
  SELECT user_id INTO v_referrer_id FROM referral_codes WHERE code = p_referral_code;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Código de indicação inválido'::TEXT;
    RETURN;
  END IF;

  -- Prevent self-referral
  IF v_referrer_id = p_referred_user_id THEN
    RETURN QUERY SELECT FALSE, 'Não é possível usar seu próprio código'::TEXT;
    RETURN;
  END IF;

  -- Check if already referred
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

  -- Add 150 lifetime credits to referrer
  INSERT INTO upscaler_credits (user_id, balance, monthly_balance, lifetime_balance)
  VALUES (v_referrer_id, 150, 0, 150)
  ON CONFLICT (user_id) DO UPDATE SET
    lifetime_balance = upscaler_credits.lifetime_balance + 150,
    balance = upscaler_credits.monthly_balance + upscaler_credits.lifetime_balance + 150,
    updated_at = now();

  SELECT monthly_balance + lifetime_balance INTO v_referrer_balance
  FROM upscaler_credits WHERE user_id = v_referrer_id;

  INSERT INTO upscaler_credit_transactions (user_id, amount, balance_after, transaction_type, description, credit_type)
  VALUES (v_referrer_id, 150, v_referrer_balance, 'bonus', 'Bônus de indicação: 150 créditos vitalícios (indicou um amigo)', 'lifetime');

  -- Record the referral
  INSERT INTO referrals (referrer_id, referred_id, referral_code)
  VALUES (v_referrer_id, p_referred_user_id, p_referral_code);

  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;
