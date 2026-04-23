
-- 1. Add FK on collaborator_unlock_earnings.collaborator_id
ALTER TABLE public.collaborator_unlock_earnings
ADD CONSTRAINT collaborator_unlock_earnings_collaborator_id_fkey
FOREIGN KEY (collaborator_id) REFERENCES public.partners(id) ON DELETE CASCADE;

-- 2. Partial unique index: only 1 pending withdrawal per partner
CREATE UNIQUE INDEX idx_one_pending_withdrawal_per_partner
ON public.partner_withdrawals (partner_id)
WHERE status = 'pendente';

-- 3. Harden the RPC with all validations
CREATE OR REPLACE FUNCTION public.register_collaborator_unlock(
  _collaborator_id UUID,
  _prompt_id TEXT,
  _prompt_title TEXT,
  _device_fingerprint TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _device_already_unlocked BOOLEAN;
  _amount NUMERIC := 0.05;
  _rows_affected INT;
  _daily_unlock_count INT;
  _max_daily_unlocks INT := 50;
BEGIN
  _user_id := auth.uid();
  
  -- Must be authenticated
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  
  -- Block self-unlock
  IF _user_id = _collaborator_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_unlock_blocked');
  END IF;
  
  -- Validate collaborator exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM partners WHERE id = _collaborator_id AND is_active = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_collaborator');
  END IF;
  
  -- Validate prompt belongs to this collaborator and is approved
  IF NOT EXISTS (
    SELECT 1 FROM partner_prompts 
    WHERE id::text = _prompt_id 
      AND partner_id = _collaborator_id 
      AND approved = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_prompt');
  END IF;
  
  -- Rate limit: max unlocks per user per day (across all collaborators)
  SELECT COUNT(*) INTO _daily_unlock_count
  FROM collaborator_unlock_earnings
  WHERE user_id = _user_id AND unlock_date = CURRENT_DATE;
  
  IF _daily_unlock_count >= _max_daily_unlocks THEN
    RETURN jsonb_build_object('success', false, 'error', 'daily_limit_reached');
  END IF;
  
  -- Check if already unlocked today (by user)
  IF EXISTS (
    SELECT 1 FROM collaborator_unlock_earnings
    WHERE user_id = _user_id AND prompt_id = _prompt_id AND unlock_date = CURRENT_DATE
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_unlocked_today');
  END IF;
  
  -- Check if already unlocked today (by device)
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
  
  -- Insert earning record
  INSERT INTO collaborator_unlock_earnings (collaborator_id, user_id, prompt_id, prompt_title, amount, device_fingerprint)
  VALUES (_collaborator_id, _user_id, _prompt_id, _prompt_title, _amount, _device_fingerprint)
  ON CONFLICT (user_id, prompt_id, unlock_date) DO NOTHING;
  
  GET DIAGNOSTICS _rows_affected = ROW_COUNT;
  
  IF _rows_affected > 0 THEN
    INSERT INTO collaborator_balances (collaborator_id, total_earned, total_unlocks)
    VALUES (_collaborator_id, _amount, 1)
    ON CONFLICT (collaborator_id) DO UPDATE
    SET total_earned = collaborator_balances.total_earned + _amount,
        total_unlocks = collaborator_balances.total_unlocks + 1,
        updated_at = now();
    
    RETURN jsonb_build_object('success', true, 'amount', _amount);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'already_unlocked_today');
  END IF;
END;
$$;
