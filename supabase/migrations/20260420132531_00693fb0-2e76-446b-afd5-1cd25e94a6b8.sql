
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
    'SELECT TRUE, COALESCE(credits_charged, false) FROM public.%I WHERE id = $1 FOR UPDATE',
    _job_table
  )
  INTO _exists, _already_charged
  USING _job_id;

  IF NOT _exists THEN
    RETURN QUERY SELECT FALSE, 0, 'Job not found'::text, false;
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

  EXECUTE format(
    'UPDATE public.%I SET credits_charged = true, user_credit_cost = $1 WHERE id = $2',
    _job_table
  )
  USING _amount, _job_id;

  RETURN QUERY SELECT TRUE, _consume_result.remaining_balance, NULL::text, false;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.consume_credits_for_job(uuid, integer, text, text, uuid) TO authenticated, service_role, anon;
