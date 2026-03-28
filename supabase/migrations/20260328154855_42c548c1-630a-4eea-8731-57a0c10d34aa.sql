
-- =====================================================
-- Add video_generator_jobs to mark_pending_job_as_failed
-- =====================================================
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
    RETURNING TRUE INTO v_updated;

  ELSIF p_table_name = 'pose_changer_jobs' THEN
    UPDATE public.pose_changer_jobs
    SET status = 'failed', error_message = p_error_message, completed_at = NOW()
    WHERE id = p_job_id AND status IN ('pending', 'queued', 'starting')
    RETURNING TRUE INTO v_updated;

  ELSIF p_table_name = 'veste_ai_jobs' THEN
    UPDATE public.veste_ai_jobs
    SET status = 'failed', error_message = p_error_message, completed_at = NOW()
    WHERE id = p_job_id AND status IN ('pending', 'queued', 'starting')
    RETURNING TRUE INTO v_updated;

  ELSIF p_table_name = 'video_upscaler_jobs' THEN
    UPDATE public.video_upscaler_jobs
    SET status = 'failed', error_message = p_error_message, completed_at = NOW()
    WHERE id = p_job_id AND status IN ('pending', 'queued', 'starting')
    RETURNING TRUE INTO v_updated;

  ELSIF p_table_name = 'arcano_cloner_jobs' THEN
    UPDATE public.arcano_cloner_jobs
    SET status = 'failed', error_message = p_error_message, completed_at = NOW()
    WHERE id = p_job_id AND status IN ('pending', 'queued', 'starting')
    RETURNING TRUE INTO v_updated;

  ELSIF p_table_name = 'character_generator_jobs' THEN
    UPDATE public.character_generator_jobs
    SET status = 'failed', error_message = p_error_message, completed_at = NOW()
    WHERE id = p_job_id AND status IN ('pending', 'queued', 'starting')
    RETURNING TRUE INTO v_updated;

  ELSIF p_table_name = 'flyer_maker_jobs' THEN
    UPDATE public.flyer_maker_jobs
    SET status = 'failed', error_message = p_error_message, completed_at = NOW()
    WHERE id = p_job_id AND status IN ('pending', 'queued', 'starting')
    RETURNING TRUE INTO v_updated;

  ELSIF p_table_name = 'bg_remover_jobs' THEN
    UPDATE public.bg_remover_jobs
    SET status = 'failed', error_message = p_error_message, completed_at = NOW()
    WHERE id = p_job_id AND status IN ('pending', 'queued', 'starting')
    RETURNING TRUE INTO v_updated;

  ELSIF p_table_name = 'image_generator_jobs' THEN
    UPDATE public.image_generator_jobs
    SET status = 'failed', error_message = p_error_message, completed_at = NOW()
    WHERE id = p_job_id AND status IN ('pending', 'queued', 'starting')
    RETURNING TRUE INTO v_updated;

  ELSIF p_table_name = 'video_generator_jobs' THEN
    UPDATE public.video_generator_jobs
    SET status = 'failed', error_message = p_error_message, completed_at = NOW()
    WHERE id = p_job_id AND status IN ('pending', 'queued', 'starting')
    RETURNING TRUE INTO v_updated;

    -- Also handle credit refund for video_generator_jobs
    IF v_updated THEN
      SELECT user_id, credits_charged, credits_refunded, user_credit_cost
      INTO v_user_id, v_credits_charged, v_credits_refunded, v_user_credit_cost
      FROM public.video_generator_jobs WHERE id = p_job_id;

      IF v_credits_charged = TRUE AND (v_credits_refunded IS NULL OR v_credits_refunded = FALSE) AND v_user_credit_cost > 0 THEN
        PERFORM public.refund_upscaler_credits(v_user_id, v_user_credit_cost, 'WATCHDOG_REFUND: ' || LEFT(p_error_message, 100));
        UPDATE public.video_generator_jobs SET credits_refunded = TRUE WHERE id = p_job_id;
      END IF;
    END IF;

  END IF;

  RETURN COALESCE(v_updated, FALSE);
END;
$$;

-- =====================================================
-- Add video_generator_jobs to user_cancel_ai_job
-- =====================================================
CREATE OR REPLACE FUNCTION public.user_cancel_ai_job(
  p_table_name TEXT,
  p_job_id UUID
)
RETURNS TABLE(success BOOLEAN, refunded_amount INT, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_status TEXT;
  v_credits_charged BOOLEAN;
  v_credits_refunded BOOLEAN;
  v_user_credit_cost INT;
  v_refund INT := 0;
BEGIN
  -- Get job info based on table
  IF p_table_name = 'upscaler_jobs' THEN
    SELECT uj.user_id, uj.status, uj.credits_charged, uj.credits_refunded, uj.user_credit_cost
    INTO v_user_id, v_status, v_credits_charged, v_credits_refunded, v_user_credit_cost
    FROM public.upscaler_jobs uj WHERE uj.id = p_job_id;
  ELSIF p_table_name = 'pose_changer_jobs' THEN
    SELECT pj.user_id, pj.status, pj.credits_charged, pj.credits_refunded, pj.user_credit_cost
    INTO v_user_id, v_status, v_credits_charged, v_credits_refunded, v_user_credit_cost
    FROM public.pose_changer_jobs pj WHERE pj.id = p_job_id;
  ELSIF p_table_name = 'veste_ai_jobs' THEN
    SELECT vj.user_id, vj.status, vj.credits_charged, vj.credits_refunded, vj.user_credit_cost
    INTO v_user_id, v_status, v_credits_charged, v_credits_refunded, v_user_credit_cost
    FROM public.veste_ai_jobs vj WHERE vj.id = p_job_id;
  ELSIF p_table_name = 'video_upscaler_jobs' THEN
    SELECT vuj.user_id, vuj.status, vuj.credits_charged, vuj.credits_refunded, vuj.user_credit_cost
    INTO v_user_id, v_status, v_credits_charged, v_credits_refunded, v_user_credit_cost
    FROM public.video_upscaler_jobs vuj WHERE vuj.id = p_job_id;
  ELSIF p_table_name = 'arcano_cloner_jobs' THEN
    SELECT acj.user_id, acj.status, acj.credits_charged, acj.credits_refunded, acj.user_credit_cost
    INTO v_user_id, v_status, v_credits_charged, v_credits_refunded, v_user_credit_cost
    FROM public.arcano_cloner_jobs acj WHERE acj.id = p_job_id;
  ELSIF p_table_name = 'character_generator_jobs' THEN
    SELECT cgj.user_id, cgj.status, cgj.credits_charged, cgj.credits_refunded, cgj.user_credit_cost
    INTO v_user_id, v_status, v_credits_charged, v_credits_refunded, v_user_credit_cost
    FROM public.character_generator_jobs cgj WHERE cgj.id = p_job_id;
  ELSIF p_table_name = 'flyer_maker_jobs' THEN
    SELECT fmj.user_id, fmj.status, fmj.credits_charged, fmj.credits_refunded, fmj.user_credit_cost
    INTO v_user_id, v_status, v_credits_charged, v_credits_refunded, v_user_credit_cost
    FROM public.flyer_maker_jobs fmj WHERE fmj.id = p_job_id;
  ELSIF p_table_name = 'bg_remover_jobs' THEN
    SELECT brj.user_id, brj.status, brj.credits_charged, brj.credits_refunded, brj.user_credit_cost
    INTO v_user_id, v_status, v_credits_charged, v_credits_refunded, v_user_credit_cost
    FROM public.bg_remover_jobs brj WHERE brj.id = p_job_id;
  ELSIF p_table_name = 'image_generator_jobs' THEN
    SELECT igj.user_id, igj.status, igj.credits_charged, igj.credits_refunded, igj.user_credit_cost
    INTO v_user_id, v_status, v_credits_charged, v_credits_refunded, v_user_credit_cost
    FROM public.image_generator_jobs igj WHERE igj.id = p_job_id;
  ELSIF p_table_name = 'video_generator_jobs' THEN
    SELECT vgj.user_id, vgj.status, vgj.credits_charged, vgj.credits_refunded, vgj.user_credit_cost
    INTO v_user_id, v_status, v_credits_charged, v_credits_refunded, v_user_credit_cost
    FROM public.video_generator_jobs vgj WHERE vgj.id = p_job_id;
  ELSE
    RETURN QUERY SELECT FALSE, 0, 'Tabela desconhecida'::TEXT;
    RETURN;
  END IF;

  -- Job not found
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Job não encontrado'::TEXT;
    RETURN;
  END IF;

  -- Already terminal
  IF v_status IN ('completed', 'failed', 'cancelled') THEN
    RETURN QUERY SELECT FALSE, 0, ('Job já está em estado terminal: ' || v_status)::TEXT;
    RETURN;
  END IF;

  -- Refund if charged and not yet refunded
  IF v_credits_charged = TRUE AND (v_credits_refunded IS NULL OR v_credits_refunded = FALSE) AND v_user_credit_cost > 0 THEN
    PERFORM public.refund_upscaler_credits(v_user_id, v_user_credit_cost, 'USER_CANCEL: Job ' || p_job_id::TEXT);
    v_refund := v_user_credit_cost;
  END IF;

  -- Update job status
  IF p_table_name = 'upscaler_jobs' THEN
    UPDATE public.upscaler_jobs SET status = 'cancelled', error_message = 'Cancelado pelo usuário', credits_refunded = TRUE, completed_at = NOW() WHERE id = p_job_id;
  ELSIF p_table_name = 'pose_changer_jobs' THEN
    UPDATE public.pose_changer_jobs SET status = 'cancelled', error_message = 'Cancelado pelo usuário', credits_refunded = TRUE, completed_at = NOW() WHERE id = p_job_id;
  ELSIF p_table_name = 'veste_ai_jobs' THEN
    UPDATE public.veste_ai_jobs SET status = 'cancelled', error_message = 'Cancelado pelo usuário', credits_refunded = TRUE, completed_at = NOW() WHERE id = p_job_id;
  ELSIF p_table_name = 'video_upscaler_jobs' THEN
    UPDATE public.video_upscaler_jobs SET status = 'cancelled', error_message = 'Cancelado pelo usuário', credits_refunded = TRUE, completed_at = NOW() WHERE id = p_job_id;
  ELSIF p_table_name = 'arcano_cloner_jobs' THEN
    UPDATE public.arcano_cloner_jobs SET status = 'cancelled', error_message = 'Cancelado pelo usuário', credits_refunded = TRUE, completed_at = NOW() WHERE id = p_job_id;
  ELSIF p_table_name = 'character_generator_jobs' THEN
    UPDATE public.character_generator_jobs SET status = 'cancelled', error_message = 'Cancelado pelo usuário', credits_refunded = TRUE, completed_at = NOW() WHERE id = p_job_id;
  ELSIF p_table_name = 'flyer_maker_jobs' THEN
    UPDATE public.flyer_maker_jobs SET status = 'cancelled', error_message = 'Cancelado pelo usuário', credits_refunded = TRUE, completed_at = NOW() WHERE id = p_job_id;
  ELSIF p_table_name = 'bg_remover_jobs' THEN
    UPDATE public.bg_remover_jobs SET status = 'cancelled', error_message = 'Cancelado pelo usuário', credits_refunded = TRUE, completed_at = NOW() WHERE id = p_job_id;
  ELSIF p_table_name = 'image_generator_jobs' THEN
    UPDATE public.image_generator_jobs SET status = 'cancelled', error_message = 'Cancelado pelo usuário', credits_refunded = TRUE, completed_at = NOW() WHERE id = p_job_id;
  ELSIF p_table_name = 'video_generator_jobs' THEN
    UPDATE public.video_generator_jobs SET status = 'cancelled', error_message = 'Cancelado pelo usuário', credits_refunded = TRUE, completed_at = NOW() WHERE id = p_job_id;
  END IF;

  RETURN QUERY SELECT TRUE, v_refund, NULL::TEXT;
END;
$$;
