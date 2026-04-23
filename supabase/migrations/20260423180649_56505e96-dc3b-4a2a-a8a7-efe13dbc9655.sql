
-- ===== Update add_partner_xp: new level thresholds =====
CREATE OR REPLACE FUNCTION public.add_partner_xp(
  _partner_id uuid,
  _xp_amount integer,
  _reason text,
  _reference_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_xp integer;
  _old_level integer;
  _new_level integer;
  _badges_awarded text[] := '{}';
  _total_earned numeric;
  _tool_job_count integer;
  _seedance_job_count integer;
BEGIN
  INSERT INTO partner_gamification (partner_id, xp_total)
  VALUES (_partner_id, _xp_amount)
  ON CONFLICT (partner_id) DO UPDATE
  SET xp_total = partner_gamification.xp_total + _xp_amount,
      updated_at = now();

  SELECT xp_total, level INTO _new_xp, _old_level
  FROM partner_gamification WHERE partner_id = _partner_id;

  -- NEW level thresholds
  _new_level := CASE
    WHEN _new_xp >= 6000 THEN 5
    WHEN _new_xp >= 2000 THEN 4
    WHEN _new_xp >= 900 THEN 3
    WHEN _new_xp >= 400 THEN 2
    ELSE 1
  END;

  IF _new_level != _old_level THEN
    UPDATE partner_gamification SET level = _new_level WHERE partner_id = _partner_id;
  END IF;

  INSERT INTO partner_xp_log (partner_id, xp_amount, reason, reference_id)
  VALUES (_partner_id, _xp_amount, _reason, _reference_id);

  -- Check badges
  IF _new_level >= 5 THEN
    IF (SELECT award_partner_badge(_partner_id, 'legendary')) THEN
      _badges_awarded := array_append(_badges_awarded, 'legendary');
    END IF;
  END IF;

  SELECT total_earned INTO _total_earned FROM collaborator_balances WHERE collaborator_id = _partner_id;
  IF COALESCE(_total_earned, 0) >= 50 THEN
    IF (SELECT award_partner_badge(_partner_id, 'millionaire')) THEN
      _badges_awarded := array_append(_badges_awarded, 'millionaire');
    END IF;
  END IF;

  SELECT COUNT(*) INTO _tool_job_count FROM collaborator_tool_earnings WHERE collaborator_id = _partner_id;
  IF _tool_job_count >= 10 THEN
    IF (SELECT award_partner_badge(_partner_id, 'ai_master')) THEN
      _badges_awarded := array_append(_badges_awarded, 'ai_master');
    END IF;
  END IF;

  SELECT COUNT(*) INTO _seedance_job_count FROM collaborator_tool_earnings WHERE collaborator_id = _partner_id AND tool_table = 'seedance_jobs';
  IF _seedance_job_count >= 5 THEN
    IF (SELECT award_partner_badge(_partner_id, 'seedance_star')) THEN
      _badges_awarded := array_append(_badges_awarded, 'seedance_star');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'xp_added', _xp_amount,
    'new_xp_total', _new_xp,
    'new_level', _new_level,
    'level_changed', _new_level != _old_level,
    'badges_awarded', _badges_awarded
  );
END;
$$;

-- ===== Update trigger: prompt inserted → 2 XP (was 10) =====
CREATE OR REPLACE FUNCTION public.trigger_partner_prompt_inserted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM update_partner_streak(NEW.partner_id);
  -- +2 XP for sending prompt (was 10)
  PERFORM add_partner_xp(NEW.partner_id, 2, 'prompt_enviado', NEW.id::text);
  PERFORM update_challenge_progress(NEW.partner_id, 'send_prompts', 1, 0);
  IF NEW.category IS NOT NULL THEN
    PERFORM update_challenge_progress(NEW.partner_id, 'send_category', 1, 0, NEW.category);
  END IF;
  RETURN NEW;
END;
$$;

-- ===== Update trigger: prompt approved → 10 XP (was 50) =====
CREATE OR REPLACE FUNCTION public.trigger_partner_prompt_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _approved_count integer;
BEGIN
  IF OLD.approved IS DISTINCT FROM NEW.approved AND NEW.approved = true THEN
    -- +10 XP for approval (was 50)
    PERFORM add_partner_xp(NEW.partner_id, 10, 'prompt_aprovado', NEW.id::text);
    
    SELECT COUNT(*) INTO _approved_count
    FROM partner_prompts WHERE partner_id = NEW.partner_id AND approved = true;
    
    IF _approved_count = 1 THEN
      PERFORM award_partner_badge(NEW.partner_id, 'first_prompt');
    END IF;
    IF _approved_count >= 50 THEN
      PERFORM award_partner_badge(NEW.partner_id, 'diamond');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ===== Update register_collaborator_tool_earning: 10 XP flat for all tools =====
CREATE OR REPLACE FUNCTION public.register_collaborator_tool_earning(
  _partner_id uuid,
  _user_id uuid,
  _job_id text,
  _tool_table text,
  _tool_name text,
  _prompt_id text,
  _prompt_title text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _level integer;
  _amount numeric;
  _rows_affected integer;
  _xp_amount integer;
BEGIN
  SELECT COALESCE(level, 1) INTO _level
  FROM partner_gamification WHERE partner_id = _partner_id;

  _amount := CASE COALESCE(_level, 1)
    WHEN 5 THEN 0.12
    WHEN 4 THEN 0.10
    WHEN 3 THEN 0.07
    WHEN 2 THEN 0.07
    ELSE 0.05
  END;
  
  INSERT INTO collaborator_tool_earnings (collaborator_id, user_id, job_id, tool_table, prompt_id, prompt_title, amount)
  VALUES (_partner_id, _user_id, _job_id, _tool_table, _prompt_id, _prompt_title, _amount)
  ON CONFLICT (job_id, tool_table) DO NOTHING;
  
  GET DIAGNOSTICS _rows_affected = ROW_COUNT;
  
  IF _rows_affected > 0 THEN
    INSERT INTO collaborator_balances (collaborator_id, total_earned, total_unlocks)
    VALUES (_partner_id, _amount, 0)
    ON CONFLICT (collaborator_id) DO UPDATE
    SET total_earned = collaborator_balances.total_earned + _amount,
        updated_at = now();

    -- 10 XP flat for ALL tools (was variable 8-20)
    PERFORM add_partner_xp(_partner_id, 10, 'uso_ferramenta_' || _tool_table, _job_id);

    PERFORM update_challenge_progress(_partner_id, 'get_tool_uses', 1, 0);
    PERFORM update_challenge_progress(_partner_id, 'earn_tool_value', 0, _amount);
    
    RETURN jsonb_build_object('success', true, 'amount', _amount, 'tool', _tool_name, 'partner_id', _partner_id);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'already_registered');
  END IF;
END;
$$;
