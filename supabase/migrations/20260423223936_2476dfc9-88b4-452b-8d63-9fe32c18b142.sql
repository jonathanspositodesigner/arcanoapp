-- Remove a função fantasma criada por acidente (assinatura diferente da real)
DROP FUNCTION IF EXISTS public.register_collaborator_unlock(uuid, uuid, text);

-- Corrige a função real para validação permanente de desbloqueios duplicados
CREATE OR REPLACE FUNCTION public.register_collaborator_unlock(_collaborator_id uuid, _prompt_id text, _prompt_title text, _device_fingerprint text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id UUID;
  _device_already_unlocked BOOLEAN;
  _amount NUMERIC;
  _partner_level integer;
  _is_founder boolean;
  _rows_affected INT;
  _daily_unlock_count INT;
  _max_daily_unlocks INT := 50;
  _collab_daily_count INT;
  _prompt_total_unlocks INT;
BEGIN
  _user_id := auth.uid();

  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF _user_id = _collaborator_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_unlock_blocked');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM partners WHERE id = _collaborator_id AND is_active = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_collaborator');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM partner_prompts
    WHERE id::text = _prompt_id
      AND partner_id = _collaborator_id
      AND approved = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_prompt');
  END IF;

  SELECT COUNT(*) INTO _daily_unlock_count
  FROM collaborator_unlock_earnings
  WHERE user_id = _user_id AND unlock_date = CURRENT_DATE;

  IF _daily_unlock_count >= _max_daily_unlocks THEN
    RETURN jsonb_build_object('success', false, 'error', 'daily_limit_reached');
  END IF;

  IF EXISTS (
    SELECT 1 FROM collaborator_unlock_earnings
    WHERE user_id = _user_id AND prompt_id = _prompt_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_unlocked');
  END IF;

  IF _device_fingerprint IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM collaborator_unlock_earnings
      WHERE device_fingerprint = _device_fingerprint
        AND prompt_id = _prompt_id
    ) INTO _device_already_unlocked;

    IF _device_already_unlocked THEN
      RETURN jsonb_build_object('success', false, 'error', 'device_already_unlocked');
    END IF;
  END IF;

  -- Read level + founder status
  SELECT COALESCE(pg.level, 1), COALESCE(p.is_founder, false)
    INTO _partner_level, _is_founder
  FROM partners p
  LEFT JOIN partner_gamification pg ON pg.partner_id = p.id
  WHERE p.id = _collaborator_id;

  -- Founder rates override (Iniciante 0.10, Criador 0.10, Colaborador 0.12, Especialista 0.15, Elite 0.20)
  IF _is_founder THEN
    _amount := CASE COALESCE(_partner_level, 1)
      WHEN 5 THEN 0.20
      WHEN 4 THEN 0.15
      WHEN 3 THEN 0.12
      WHEN 2 THEN 0.10
      ELSE 0.10
    END;
  ELSE
    _amount := CASE COALESCE(_partner_level, 1)
      WHEN 5 THEN 0.12
      WHEN 4 THEN 0.10
      WHEN 3 THEN 0.07
      WHEN 2 THEN 0.07
      ELSE 0.05
    END;
  END IF;

  INSERT INTO collaborator_unlock_earnings (collaborator_id, user_id, prompt_id, prompt_title, amount, device_fingerprint)
  VALUES (_collaborator_id, _user_id, _prompt_id, _prompt_title, _amount, _device_fingerprint)
  ON CONFLICT (user_id, prompt_id) DO NOTHING;

  GET DIAGNOSTICS _rows_affected = ROW_COUNT;

  IF _rows_affected > 0 THEN
    INSERT INTO collaborator_balances (collaborator_id, total_earned, total_unlocks)
    VALUES (_collaborator_id, _amount, 1)
    ON CONFLICT (collaborator_id) DO UPDATE
    SET total_earned = collaborator_balances.total_earned + _amount,
        total_unlocks = collaborator_balances.total_unlocks + 1,
        updated_at = now();

    PERFORM add_partner_xp(_collaborator_id, 2, 'desbloqueio_recebido', _prompt_id);

    SELECT COUNT(*) INTO _collab_daily_count
    FROM collaborator_unlock_earnings
    WHERE collaborator_id = _collaborator_id AND unlock_date = CURRENT_DATE;

    IF _collab_daily_count = 10 THEN
      PERFORM add_partner_xp(_collaborator_id, 25, 'bonus_10_desbloqueios_dia');
    END IF;

    SELECT COUNT(*) INTO _prompt_total_unlocks
    FROM collaborator_unlock_earnings
    WHERE collaborator_id = _collaborator_id AND prompt_id = _prompt_id;

    IF _prompt_total_unlocks = 50 THEN
      PERFORM add_partner_xp(_collaborator_id, 100, 'prompt_50_desbloqueios', _prompt_id);
    ELSIF _prompt_total_unlocks = 100 THEN
      PERFORM add_partner_xp(_collaborator_id, 150, 'prompt_100_desbloqueios', _prompt_id);
      PERFORM award_partner_badge(_collaborator_id, 'viral');
    END IF;

    RETURN jsonb_build_object('success', true, 'amount', _amount, 'is_founder', _is_founder);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'duplicate');
  END IF;
END;
$function$;