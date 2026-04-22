CREATE OR REPLACE FUNCTION public.protect_ai_job_financial_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role'
     OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
     OR current_setting('app.ai_financial_write', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF OLD.credits_charged IS DISTINCT FROM NEW.credits_charged THEN
    RAISE EXCEPTION 'Cannot modify credits_charged';
  END IF;

  IF OLD.credits_refunded IS DISTINCT FROM NEW.credits_refunded THEN
    RAISE EXCEPTION 'Cannot modify credits_refunded';
  END IF;

  IF OLD.output_url IS DISTINCT FROM NEW.output_url THEN
    RAISE EXCEPTION 'Cannot modify output_url';
  END IF;

  IF OLD.task_id IS DISTINCT FROM NEW.task_id THEN
    RAISE EXCEPTION 'Cannot modify task_id';
  END IF;

  IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'Cannot modify user_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_credits_for_job(
  _user_id uuid,
  _amount integer,
  _description text,
  _job_table text,
  _job_id uuid
)
RETURNS TABLE(success boolean, remaining_balance integer, error_message text, already_charged boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _already_charged boolean := false;
  _exists boolean := false;
  _job_user_id uuid := null;
  _job_status text := null;
  _consume_result record;
  _allowed_tables text[] := ARRAY[
    'arcano_cloner_jobs',
    'image_generator_jobs',
    'flyer_maker_jobs',
    'pose_changer_jobs',
    'upscaler_jobs',
    'bg_remover_jobs',
    'character_generator_jobs',
    'movieled_jobs',
    'veste_ai_jobs'
  ];
BEGIN
  IF NOT (_job_table = ANY(_allowed_tables)) THEN
    RETURN QUERY SELECT FALSE, 0, ('Invalid job table: ' || _job_table)::text, false;
    RETURN;
  END IF;

  EXECUTE format(
    'SELECT TRUE, COALESCE(credits_charged, false), user_id, status FROM public.%I WHERE id = $1 FOR UPDATE',
    _job_table
  )
  INTO _exists, _already_charged, _job_user_id, _job_status
  USING _job_id;

  IF NOT _exists THEN
    RETURN QUERY SELECT FALSE, 0, 'Job not found'::text, false;
    RETURN;
  END IF;

  IF _job_user_id IS DISTINCT FROM _user_id THEN
    RETURN QUERY SELECT FALSE, 0, 'Job ownership mismatch'::text, false;
    RETURN;
  END IF;

  IF _job_status IN ('failed', 'cancelled') THEN
    RETURN QUERY SELECT FALSE, 0, ('Job is not chargeable in status ' || _job_status)::text, false;
    RETURN;
  END IF;

  IF _already_charged THEN
    RETURN QUERY SELECT TRUE, 0, NULL::text, true;
    RETURN;
  END IF;

  SELECT * INTO _consume_result
  FROM public.consume_upscaler_credits(_user_id, _amount, _description);

  IF NOT _consume_result.success THEN
    RETURN QUERY SELECT FALSE, COALESCE(_consume_result.remaining_balance, 0), _consume_result.error_message, false;
    RETURN;
  END IF;

  PERFORM set_config('app.ai_financial_write', 'on', true);

  EXECUTE format(
    'UPDATE public.%I SET credits_charged = true, user_credit_cost = $1 WHERE id = $2',
    _job_table
  )
  USING _amount, _job_id;

  RETURN QUERY SELECT TRUE, _consume_result.remaining_balance, NULL::text, false;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.consume_credits_for_job(uuid, integer, text, text, uuid) TO authenticated, service_role, anon;

CREATE UNIQUE INDEX IF NOT EXISTS ux_arcano_cloner_one_active_job_per_user
ON public.arcano_cloner_jobs (user_id)
WHERE user_id IS NOT NULL
  AND status IN ('pending', 'queued', 'starting', 'running');