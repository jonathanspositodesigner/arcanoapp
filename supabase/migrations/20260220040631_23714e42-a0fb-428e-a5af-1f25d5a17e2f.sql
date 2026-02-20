
-- 1. Create landing_cloner_trials table
CREATE TABLE public.landing_cloner_trials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  token_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  confirmed_at TIMESTAMPTZ NULL,
  user_id UUID NULL,
  credits_granted INTEGER NOT NULL DEFAULT 0,
  credits_expire_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index on email
CREATE UNIQUE INDEX idx_landing_cloner_trials_email ON public.landing_cloner_trials (email);

-- Enable RLS - only service_role has access
ALTER TABLE public.landing_cloner_trials ENABLE ROW LEVEL SECURITY;

-- 2. Add landing_trial_expires_at column to upscaler_credits
ALTER TABLE public.upscaler_credits ADD COLUMN landing_trial_expires_at TIMESTAMPTZ NULL;

-- 3. RPC: check_landing_trial_status
CREATE OR REPLACE FUNCTION public.check_landing_trial_status(_user_id uuid)
RETURNS TABLE(is_landing_trial boolean, credits_expired boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (uc.landing_trial_expires_at IS NOT NULL)::boolean AS is_landing_trial,
    (uc.landing_trial_expires_at IS NOT NULL AND uc.landing_trial_expires_at < now())::boolean AS credits_expired
  FROM upscaler_credits uc
  WHERE uc.user_id = _user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false::boolean, false::boolean;
  END IF;
END;
$$;

-- 4. RPC: expire_landing_trial_credits - zeroes monthly balance if trial expired
CREATE OR REPLACE FUNCTION public.expire_landing_trial_credits(_user_id uuid)
RETURNS TABLE(was_expired boolean, new_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
  v_monthly INTEGER;
  v_lifetime INTEGER;
  v_updated_balance INTEGER;
BEGIN
  SELECT landing_trial_expires_at, monthly_balance, lifetime_balance
  INTO v_expires_at, v_monthly, v_lifetime
  FROM upscaler_credits
  WHERE user_id = _user_id
  FOR UPDATE;

  IF NOT FOUND OR v_expires_at IS NULL THEN
    RETURN QUERY SELECT false::boolean, COALESCE(v_monthly + v_lifetime, 0)::integer;
    RETURN;
  END IF;

  IF v_expires_at > now() THEN
    RETURN QUERY SELECT false::boolean, (v_monthly + v_lifetime)::integer;
    RETURN;
  END IF;

  -- Expire: zero out monthly balance
  UPDATE upscaler_credits
  SET monthly_balance = 0,
      balance = lifetime_balance,
      updated_at = now()
  WHERE user_id = _user_id;

  -- Log transaction
  INSERT INTO upscaler_credit_transactions (user_id, amount, balance_after, transaction_type, description, credit_type)
  VALUES (_user_id, -v_monthly, v_lifetime, 'consumption', 'Créditos de teste expirados (24h)', 'monthly');

  RETURN QUERY SELECT true::boolean, v_lifetime::integer;
END;
$$;
