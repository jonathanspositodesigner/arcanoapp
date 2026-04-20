CREATE OR REPLACE FUNCTION public.mark_pending_job_as_failed(
  p_table_name TEXT,
  p_job_id UUID,
  p_error_message TEXT DEFAULT 'Job marcado como falho pelo sistema'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated BOOLEAN := FALSE;
  v_user_id UUID;
  v_credits_charged BOOLEAN;
  v_credits_refunded BOOLEAN;
  v_user_credit_cost INT;
BEGIN
  IF p_table_name = 'upscaler_jobs' THEN
    UPDATE public.upscaler_jobs
    SET status = 'failed', error_message = p_error_message, completed_at = NOW()
    WHERE id = p_job_id AND status IN ('pending', 'queued', 'starting')
    RETURNING TRUE, user_id, COALESCE(credits_charged, FALSE), COALESCE(credits_refunded, FALSE), COALESCE(user_credit_cost, 0)
    INTO v_updated, v_user_id, v_credits_charged, v_credits_refunded, v_user_credit_cost;

  ELSIF p_table_name = 'pose_changer_jobs' THEN
    UPDATE public.pose_changer_jobs
    SET status = 'failed', error_message = p_error_message, completed_at = NOW()
    WHERE id = p_job_id AND status IN ('pending', 'queued', 'starting')
    RETURNING TRUE, user_id, COALESCE(credits_charged, FALSE), COALESCE(credits_refunded, FALSE), COALESCE(user_credit_cost, 0)
    INTO v_updated, v_user_id, v_credits_charged, v_credits_refunded, v_user_credit_cost;

  ELSIF p_table_name = 'veste_ai_jobs' THEN
    UPDATE public.veste_ai_jobs
    SET status = 'failed', error_message = p_error_message, completed_at = NOW()
    WHERE id = p_job_id AND status IN ('pending', 'queued', 'starting')
    RETURNING TRUE, user_id, COALESCE(credits_charged, FALSE), COALESCE(credits_refunded, FALSE), COALESCE(user_credit_cost, 0)
    INTO v_updated, v_user_id, v_credits_charged, v_credits_refunded, v_user_credit_cost;

  ELSIF p_table_name = 'video_upscaler_jobs' THEN
    UPDATE public.video_upscaler_jobs
    SET status = 'failed', error_message = p_error_message, completed_at = NOW()
    WHERE id = p_job_id AND status IN ('pending', 'queued', 'starting')
    RETURNING TRUE, user_id, COALESCE(credits_charged, FALSE), COALESCE(credits_refunded, FALSE), COALESCE(user_credit_cost, 0)
    INTO v_updated, v_user_id, v_credits_charged, v_credits_refunded, v_user_credit_cost;

  ELSIF p_table_name = 'arcano_cloner_jobs' THEN
    UPDATE public.arcano_cloner_jobs
    SET status = 'failed', error_message = p_error_message, completed_at = NOW()
    WHERE id = p_job_id AND status IN ('pending', 'queued', 'starting')
    RETURNING TRUE, user_id, COALESCE(credits_charged, FALSE), COALESCE(credits_refunded, FALSE), COALESCE(user_credit_cost, 0)
    INTO v_updated, v_user_id, v_credits_charged, v_credits_refunded, v_user_credit_cost;

  ELSIF p_table_name = 'character_generator_jobs' THEN
    UPDATE public.character_generator_jobs
    SET status = 'failed', error_message = p_error_message, completed_at = NOW()
    WHERE id = p_job_id AND status IN ('pending', 'queued', 'starting')
    RETURNING TRUE, user_id, COALESCE(credits_charged, FALSE), COALESCE(credits_refunded, FALSE), COALESCE(user_credit_cost, 0)
    INTO v_updated, v_user_id, v_credits_charged, v_credits_refunded, v_user_credit_cost;

  ELSIF p_table_name = 'flyer_maker_jobs' THEN
    UPDATE public.flyer_maker_jobs
    SET status = 'failed', error_message = p_error_message, completed_at = NOW()
    WHERE id = p_job_id AND status IN ('pending', 'queued', 'starting')
    RETURNING TRUE, user_id, COALESCE(credits_charged, FALSE), COALESCE(credits_refunded, FALSE), COALESCE(user_credit_cost, 0)
    INTO v_updated, v_user_id, v_credits_charged, v_credits_refunded, v_user_credit_cost;

  ELSIF p_table_name = 'bg_remover_jobs' THEN
    UPDATE public.bg_remover_jobs
    SET status = 'failed', error_message = p_error_message, completed_at = NOW()
    WHERE id = p_job_id AND status IN ('pending', 'queued', 'starting')
    RETURNING TRUE, user_id, COALESCE(credits_charged, FALSE), COALESCE(credits_refunded, FALSE), COALESCE(user_credit_cost, 0)
    INTO v_updated, v_user_id, v_credits_charged, v_credits_refunded, v_user_credit_cost;

  ELSIF p_table_name = 'image_generator_jobs' THEN
    UPDATE public.image_generator_jobs
    SET status = 'failed', error_message = p_error_message, completed_at = NOW()
    WHERE id = p_job_id AND status IN ('pending', 'queued', 'starting')
    RETURNING TRUE, user_id, COALESCE(credits_charged, FALSE), COALESCE(credits_refunded, FALSE), COALESCE(user_credit_cost, 0)
    INTO v_updated, v_user_id, v_credits_charged, v_credits_refunded, v_user_credit_cost;

  ELSIF p_table_name = 'video_generator_jobs' THEN
    UPDATE public.video_generator_jobs
    SET status = 'failed', error_message = p_error_message, completed_at = NOW()
    WHERE id = p_job_id AND status IN ('pending', 'queued', 'starting')
    RETURNING TRUE, user_id, COALESCE(credits_charged, FALSE), COALESCE(credits_refunded, FALSE), COALESCE(user_credit_cost, 0)
    INTO v_updated, v_user_id, v_credits_charged, v_credits_refunded, v_user_credit_cost;

  ELSIF p_table_name = 'movieled_maker_jobs' THEN
    UPDATE public.movieled_maker_jobs
    SET status = 'failed', error_message = p_error_message, completed_at = NOW()
    WHERE id = p_job_id AND status IN ('pending', 'queued', 'starting')
    RETURNING TRUE, user_id, COALESCE(credits_charged, FALSE), COALESCE(credits_refunded, FALSE), COALESCE(user_credit_cost, 0)
    INTO v_updated, v_user_id, v_credits_charged, v_credits_refunded, v_user_credit_cost;

  ELSE
    RETURN FALSE;
  END IF;

  IF COALESCE(v_updated, FALSE)
     AND v_credits_charged = TRUE
     AND COALESCE(v_credits_refunded, FALSE) = FALSE
     AND COALESCE(v_user_credit_cost, 0) > 0
     AND v_user_id IS NOT NULL THEN
    PERFORM public.refund_upscaler_credits(
      v_user_id,
      v_user_credit_cost,
      'WATCHDOG_REFUND: ' || LEFT(p_error_message, 100)
    );

    EXECUTE format(
      'UPDATE public.%I SET credits_refunded = TRUE WHERE id = $1',
      p_table_name
    ) USING p_job_id;
  END IF;

  RETURN COALESCE(v_updated, FALSE);
END;
$$;