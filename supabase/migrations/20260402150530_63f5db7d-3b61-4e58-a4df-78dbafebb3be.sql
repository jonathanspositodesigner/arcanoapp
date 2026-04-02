CREATE OR REPLACE FUNCTION public.user_cancel_ai_job(p_table_name text, p_job_id uuid)
RETURNS TABLE(success boolean, refunded_amount integer, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_status TEXT;
  v_credits_charged BOOLEAN := FALSE;
  v_credits_refunded BOOLEAN := FALSE;
  v_user_credit_cost INT := 0;
  v_refund INT := 0;
  v_should_refund BOOLEAN := FALSE;
  v_cancel_message TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Acesso negado'::TEXT;
    RETURN;
  END IF;

  IF p_table_name NOT IN (
    'upscaler_jobs',
    'pose_changer_jobs',
    'veste_ai_jobs',
    'video_upscaler_jobs',
    'arcano_cloner_jobs',
    'character_generator_jobs',
    'flyer_maker_jobs',
    'bg_remover_jobs',
    'image_generator_jobs',
    'video_generator_jobs',
    'movieled_maker_jobs'
  ) THEN
    RETURN QUERY SELECT FALSE, 0, 'Tabela desconhecida'::TEXT;
    RETURN;
  END IF;

  EXECUTE format(
    'SELECT user_id, status, COALESCE(credits_charged, FALSE), COALESCE(credits_refunded, FALSE), COALESCE(user_credit_cost, 0) FROM public.%I WHERE id = $1',
    p_table_name
  )
  INTO v_user_id, v_status, v_credits_charged, v_credits_refunded, v_user_credit_cost
  USING p_job_id;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Job não encontrado'::TEXT;
    RETURN;
  END IF;

  IF v_user_id <> auth.uid() THEN
    RETURN QUERY SELECT FALSE, 0, 'Acesso negado: job pertence a outro usuário'::TEXT;
    RETURN;
  END IF;

  IF v_status IN ('completed', 'failed', 'cancelled') THEN
    RETURN QUERY SELECT FALSE, 0, ('Job já está em estado terminal: ' || v_status)::TEXT;
    RETURN;
  END IF;

  v_should_refund := v_status IN ('queued', 'pending')
    AND v_credits_charged = TRUE
    AND (v_credits_refunded IS NULL OR v_credits_refunded = FALSE)
    AND v_user_credit_cost > 0;

  IF v_should_refund THEN
    PERFORM public.refund_upscaler_credits(v_user_id, v_user_credit_cost, 'USER_CANCEL: Job ' || p_job_id::TEXT);
    v_refund := v_user_credit_cost;
    v_cancel_message := 'Cancelado pelo usuário com estorno de créditos';
  ELSE
    v_cancel_message := 'Cancelado pelo usuário sem estorno (processamento já iniciado)';
  END IF;

  EXECUTE format(
    'UPDATE public.%I SET status = ''cancelled'', error_message = $2, credits_refunded = CASE WHEN $3 > 0 THEN TRUE ELSE COALESCE(credits_refunded, FALSE) END, completed_at = NOW() WHERE id = $1',
    p_table_name
  )
  USING p_job_id, v_cancel_message, v_refund;

  RETURN QUERY SELECT TRUE, v_refund, NULL::TEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_cancel_job(p_table_name text, p_job_id uuid)
RETURNS TABLE(success boolean, refunded_amount integer, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_credit_cost INTEGER := 0;
  v_current_status TEXT;
  v_credits_charged BOOLEAN := FALSE;
  v_credits_refunded BOOLEAN := FALSE;
  v_cancel_message TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT FALSE, 0, 'Acesso negado: requer permissão de admin'::TEXT;
    RETURN;
  END IF;

  IF p_table_name NOT IN (
    'upscaler_jobs',
    'pose_changer_jobs',
    'veste_ai_jobs',
    'video_upscaler_jobs',
    'arcano_cloner_jobs',
    'character_generator_jobs',
    'flyer_maker_jobs',
    'bg_remover_jobs',
    'image_generator_jobs',
    'video_generator_jobs',
    'movieled_maker_jobs'
  ) THEN
    RETURN QUERY SELECT FALSE, 0, 'Tabela inválida'::TEXT;
    RETURN;
  END IF;

  EXECUTE format(
    'SELECT user_id, COALESCE(user_credit_cost, 0), status, COALESCE(credits_charged, FALSE), COALESCE(credits_refunded, FALSE) FROM public.%I WHERE id = $1',
    p_table_name
  )
  INTO v_user_id, v_credit_cost, v_current_status, v_credits_charged, v_credits_refunded
  USING p_job_id;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Job não encontrado'::TEXT;
    RETURN;
  END IF;

  IF v_current_status IN ('completed', 'failed', 'cancelled') THEN
    RETURN QUERY SELECT FALSE, 0, 'Job já finalizado, não pode ser cancelado'::TEXT;
    RETURN;
  END IF;

  IF v_credit_cost > 0 AND v_credits_charged AND NOT v_credits_refunded THEN
    PERFORM public.refund_upscaler_credits(v_user_id, v_credit_cost, 'Estorno manual: job cancelado pelo admin');
    v_cancel_message := 'Cancelado manualmente pelo administrador. Créditos estornados.';
  ELSE
    v_credit_cost := 0;
    v_cancel_message := 'Cancelado manualmente pelo administrador.';
  END IF;

  EXECUTE format(
    'UPDATE public.%I SET status = ''cancelled'', credits_refunded = CASE WHEN $2 > 0 THEN TRUE ELSE COALESCE(credits_refunded, FALSE) END, error_message = $3, completed_at = NOW() WHERE id = $1',
    p_table_name
  )
  USING p_job_id, v_credit_cost, v_cancel_message;

  RETURN QUERY SELECT TRUE, v_credit_cost, NULL::TEXT;
END;
$function$;