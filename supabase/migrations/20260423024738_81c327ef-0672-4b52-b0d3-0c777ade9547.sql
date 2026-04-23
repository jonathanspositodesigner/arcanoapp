
-- Table to track each unlock earning
CREATE TABLE public.collaborator_unlock_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id UUID NOT NULL,
  user_id UUID NOT NULL,
  prompt_id TEXT NOT NULL,
  prompt_title TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0.05,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unlock_date DATE NOT NULL DEFAULT CURRENT_DATE,
  device_fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, prompt_id, unlock_date)
);

-- Accumulated balance per collaborator
CREATE TABLE public.collaborator_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id UUID NOT NULL UNIQUE,
  total_earned NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_unlocks INTEGER NOT NULL DEFAULT 0,
  last_payment_at TIMESTAMPTZ,
  last_payment_amount NUMERIC(10,2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.collaborator_unlock_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborator_balances ENABLE ROW LEVEL SECURITY;

-- Collaborators can see their own earnings
CREATE POLICY "Collaborators can view own earnings"
ON public.collaborator_unlock_earnings
FOR SELECT TO authenticated
USING (collaborator_id = auth.uid());

-- Collaborators can see their own balance
CREATE POLICY "Collaborators can view own balance"
ON public.collaborator_balances
FOR SELECT TO authenticated
USING (collaborator_id = auth.uid());

-- Indexes
CREATE INDEX idx_collab_earnings_collaborator ON public.collaborator_unlock_earnings(collaborator_id);
CREATE INDEX idx_collab_earnings_date ON public.collaborator_unlock_earnings(unlock_date);
CREATE INDEX idx_collab_earnings_user_prompt_date ON public.collaborator_unlock_earnings(user_id, prompt_id, unlock_date);
CREATE INDEX idx_collab_earnings_device ON public.collaborator_unlock_earnings(device_fingerprint, prompt_id, unlock_date);

-- Secure RPC to register an unlock
CREATE OR REPLACE FUNCTION public.register_collaborator_unlock(
  _collaborator_id UUID,
  _prompt_id TEXT,
  _prompt_title TEXT,
  _device_fingerprint TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _daily_collaborator_earnings NUMERIC;
  _device_already_unlocked BOOLEAN;
  _amount NUMERIC := 0.05;
BEGIN
  _user_id := auth.uid();
  
  -- Must be authenticated
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  
  -- Cannot unlock own prompts (anti-fraud)
  IF _user_id = _collaborator_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_unlock_blocked');
  END IF;
  
  -- Check if already unlocked today by this user
  IF EXISTS (
    SELECT 1 FROM collaborator_unlock_earnings
    WHERE user_id = _user_id AND prompt_id = _prompt_id AND unlock_date = CURRENT_DATE
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_unlocked_today');
  END IF;
  
  -- Check device fingerprint limit
  IF _device_fingerprint IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM collaborator_unlock_earnings
      WHERE device_fingerprint = _device_fingerprint 
        AND prompt_id = _prompt_id 
        AND unlock_date = CURRENT_DATE
    ) INTO _device_already_unlocked;
    
    IF _device_already_unlocked THEN
      RETURN jsonb_build_object('success', false, 'error', 'device_already_unlocked');
    END IF;
  END IF;
  
  -- Check daily cap for collaborator (R$5.00/day = 100 unlocks)
  SELECT COALESCE(SUM(amount), 0) INTO _daily_collaborator_earnings
  FROM collaborator_unlock_earnings
  WHERE collaborator_id = _collaborator_id AND unlock_date = CURRENT_DATE;
  
  IF _daily_collaborator_earnings >= 5.00 THEN
    RETURN jsonb_build_object('success', false, 'error', 'collaborator_daily_cap_reached');
  END IF;
  
  -- Insert the earning record
  INSERT INTO collaborator_unlock_earnings (collaborator_id, user_id, prompt_id, prompt_title, amount, device_fingerprint)
  VALUES (_collaborator_id, _user_id, _prompt_id, _prompt_title, _amount, _device_fingerprint)
  ON CONFLICT (user_id, prompt_id, unlock_date) DO NOTHING;
  
  -- Upsert the collaborator balance
  INSERT INTO collaborator_balances (collaborator_id, total_earned, total_unlocks)
  VALUES (_collaborator_id, _amount, 1)
  ON CONFLICT (collaborator_id) DO UPDATE
  SET total_earned = collaborator_balances.total_earned + _amount,
      total_unlocks = collaborator_balances.total_unlocks + 1,
      updated_at = now();
  
  RETURN jsonb_build_object('success', true, 'amount', _amount);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.register_collaborator_unlock TO authenticated;
