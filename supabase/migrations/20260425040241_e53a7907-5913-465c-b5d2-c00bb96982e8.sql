-- 1. Add reference_prompt_id to image_generator_jobs
ALTER TABLE public.image_generator_jobs 
ADD COLUMN IF NOT EXISTS reference_prompt_id text;

CREATE INDEX IF NOT EXISTS idx_image_generator_jobs_reference_prompt 
ON public.image_generator_jobs(reference_prompt_id) 
WHERE reference_prompt_id IS NOT NULL;

-- 2. Create trigger on image_generator_jobs
DROP TRIGGER IF EXISTS trg_register_earning_image_generator ON public.image_generator_jobs;
CREATE TRIGGER trg_register_earning_image_generator
AFTER INSERT OR UPDATE ON public.image_generator_jobs
FOR EACH ROW
EXECUTE FUNCTION public.trg_register_tool_earning_from_job('image_generator_jobs');

-- 3. Update register_collaborator_tool_earning: lifetime instead of daily
CREATE OR REPLACE FUNCTION public.register_collaborator_tool_earning(_user_id uuid, _job_id text, _tool_table text, _prompt_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _partner_id UUID;
  _prompt_title TEXT;
  _amount NUMERIC;
  _tool_name TEXT;
  _rows_affected INT;
  _xp_amount INT;
BEGIN
  SELECT earning_per_use, tool_display_name INTO _amount, _tool_name
  FROM collaborator_tool_rates
  WHERE tool_table = _tool_table AND is_active = true;
  
  IF _amount IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'tool_not_configured');
  END IF;
  
  SELECT pp.partner_id, pp.title INTO _partner_id, _prompt_title
  FROM partner_prompts pp
  JOIN partners p ON p.id = pp.partner_id
  WHERE pp.id::text = _prompt_id
    AND pp.approved = true
    AND p.is_active = true;
  
  IF _partner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_prompt_or_partner');
  END IF;
  
  IF _user_id IN (SELECT user_id FROM partners WHERE id = _partner_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_usage_blocked');
  END IF;

  -- LIFETIME LIMIT: 1 earning per (user × prompt) forever (across all tools/sessions)
  IF EXISTS (
    SELECT 1 FROM collaborator_tool_earnings
    WHERE user_id = _user_id
      AND prompt_id = _prompt_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'lifetime_user_prompt_limit_reached',
      'message', 'Already credited for this user+prompt'
    );
  END IF;
  
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

    _xp_amount := CASE _tool_table
      WHEN 'seedance_jobs' THEN 20
      WHEN 'movieled_maker_jobs' THEN 12
      ELSE 8
    END;
    PERFORM add_partner_xp(_partner_id, _xp_amount, 'uso_ferramenta_' || _tool_table, _job_id);

    PERFORM update_challenge_progress(_partner_id, 'get_tool_uses', 1, 0);
    PERFORM update_challenge_progress(_partner_id, 'earn_tool_value', 0, _amount);
    
    RETURN jsonb_build_object('success', true, 'amount', _amount, 'tool', _tool_name, 'partner_id', _partner_id);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'already_registered');
  END IF;
END;
$function$;