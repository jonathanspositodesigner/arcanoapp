
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
  _device_already_unlocked BOOLEAN;
  _amount NUMERIC := 0.05;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  
  IF _user_id = _collaborator_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_unlock_blocked');
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM collaborator_unlock_earnings
    WHERE user_id = _user_id AND prompt_id = _prompt_id AND unlock_date = CURRENT_DATE
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_unlocked_today');
  END IF;
  
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
  
  INSERT INTO collaborator_unlock_earnings (collaborator_id, user_id, prompt_id, prompt_title, amount, device_fingerprint)
  VALUES (_collaborator_id, _user_id, _prompt_id, _prompt_title, _amount, _device_fingerprint)
  ON CONFLICT (user_id, prompt_id, unlock_date) DO NOTHING;
  
  INSERT INTO collaborator_balances (collaborator_id, total_earned, total_unlocks)
  VALUES (_collaborator_id, _amount, 1)
  ON CONFLICT (collaborator_id) DO UPDATE
  SET total_earned = collaborator_balances.total_earned + _amount,
      total_unlocks = collaborator_balances.total_unlocks + 1,
      updated_at = now();
  
  RETURN jsonb_build_object('success', true, 'amount', _amount);
END;
$$;
