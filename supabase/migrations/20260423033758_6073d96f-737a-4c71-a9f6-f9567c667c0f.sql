
-- 1. Fix the RPC to only increment balance when insert actually happens
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
  _inserted BOOLEAN;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  
  -- Block self-unlock
  IF _user_id = _collaborator_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_unlock_blocked');
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
  
  -- Try to insert the earning record
  INSERT INTO collaborator_unlock_earnings (collaborator_id, user_id, prompt_id, prompt_title, amount, device_fingerprint)
  VALUES (_collaborator_id, _user_id, _prompt_id, _prompt_title, _amount, _device_fingerprint)
  ON CONFLICT (user_id, prompt_id, unlock_date) DO NOTHING;
  
  -- Only increment balance if the insert actually happened
  GET DIAGNOSTICS _inserted = ROW_COUNT;
  
  IF _inserted THEN
    INSERT INTO collaborator_balances (collaborator_id, total_earned, total_unlocks)
    VALUES (_collaborator_id, _amount, 1)
    ON CONFLICT (collaborator_id) DO UPDATE
    SET total_earned = collaborator_balances.total_earned + _amount,
        total_unlocks = collaborator_balances.total_unlocks + 1,
        updated_at = now();
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'already_unlocked_today');
  END IF;
  
  RETURN jsonb_build_object('success', true, 'amount', _amount);
END;
$$;

-- 2. Add admin RLS policies for collaborator tables
CREATE POLICY "Admins can view all balances"
ON public.collaborator_balances
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all earnings"
ON public.collaborator_unlock_earnings
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Create reconciliation function to fix any drifted balances
CREATE OR REPLACE FUNCTION public.reconcile_collaborator_balances()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _fixed INT := 0;
  _rec RECORD;
BEGIN
  -- Only admins can run this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_admin');
  END IF;

  -- For each collaborator, recalculate from source of truth
  FOR _rec IN
    SELECT 
      collaborator_id,
      COALESCE(SUM(amount), 0) as real_earned,
      COUNT(*) as real_unlocks
    FROM collaborator_unlock_earnings
    GROUP BY collaborator_id
  LOOP
    INSERT INTO collaborator_balances (collaborator_id, total_earned, total_unlocks, updated_at)
    VALUES (_rec.collaborator_id, _rec.real_earned, _rec.real_unlocks, now())
    ON CONFLICT (collaborator_id) DO UPDATE
    SET total_earned = _rec.real_earned,
        total_unlocks = _rec.real_unlocks,
        updated_at = now()
    WHERE collaborator_balances.total_earned != _rec.real_earned
       OR collaborator_balances.total_unlocks != _rec.real_unlocks;
    
    IF FOUND THEN
      _fixed := _fixed + 1;
    END IF;
  END LOOP;

  -- Remove orphaned balances (no earnings exist)
  DELETE FROM collaborator_balances
  WHERE collaborator_id NOT IN (
    SELECT DISTINCT collaborator_id FROM collaborator_unlock_earnings
  );

  RETURN jsonb_build_object('success', true, 'fixed', _fixed);
END;
$$;
