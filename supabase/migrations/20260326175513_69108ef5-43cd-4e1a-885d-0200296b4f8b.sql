
-- 1. Update user_cancel_ai_job to include arcano_cloner_jobs and image_generator_jobs
CREATE OR REPLACE FUNCTION public.user_cancel_ai_job(p_table_name text, p_job_id uuid)
 RETURNS TABLE(success boolean, refunded_amount integer, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_credit_cost INTEGER;
  v_current_status TEXT;
  v_auth_user_id UUID;
  v_credits_charged BOOLEAN;
  v_credits_refunded BOOLEAN;
  v_should_refund BOOLEAN;
BEGIN
  v_auth_user_id := auth.uid();
  IF v_auth_user_id IS NULL THEN RETURN QUERY SELECT FALSE, 0, 'Usuário não autenticado'::TEXT; RETURN; END IF;

  IF p_table_name = 'upscaler_jobs' THEN
    SELECT user_id, COALESCE(user_credit_cost, 0), status, COALESCE(credits_charged, false), COALESCE(credits_refunded, false)
    INTO v_user_id, v_credit_cost, v_current_status, v_credits_charged, v_credits_refunded FROM upscaler_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'pose_changer_jobs' THEN
    SELECT user_id, COALESCE(user_credit_cost, 0), status, COALESCE(credits_charged, false), COALESCE(credits_refunded, false)
    INTO v_user_id, v_credit_cost, v_current_status, v_credits_charged, v_credits_refunded FROM pose_changer_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'veste_ai_jobs' THEN
    SELECT user_id, COALESCE(user_credit_cost, 0), status, COALESCE(credits_charged, false), COALESCE(credits_refunded, false)
    INTO v_user_id, v_credit_cost, v_current_status, v_credits_charged, v_credits_refunded FROM veste_ai_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'video_upscaler_jobs' THEN
    SELECT user_id, COALESCE(user_credit_cost, 0), status, COALESCE(credits_charged, false), COALESCE(credits_refunded, false)
    INTO v_user_id, v_credit_cost, v_current_status, v_credits_charged, v_credits_refunded FROM video_upscaler_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'character_generator_jobs' THEN
    SELECT user_id, COALESCE(user_credit_cost, 0), status, COALESCE(credits_charged, false), COALESCE(credits_refunded, false)
    INTO v_user_id, v_credit_cost, v_current_status, v_credits_charged, v_credits_refunded FROM character_generator_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'flyer_maker_jobs' THEN
    SELECT user_id, COALESCE(user_credit_cost, 0), status, COALESCE(credits_charged, false), COALESCE(credits_refunded, false)
    INTO v_user_id, v_credit_cost, v_current_status, v_credits_charged, v_credits_refunded FROM flyer_maker_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'bg_remover_jobs' THEN
    SELECT user_id, COALESCE(user_credit_cost, 0), status, COALESCE(credits_charged, false), COALESCE(credits_refunded, false)
    INTO v_user_id, v_credit_cost, v_current_status, v_credits_charged, v_credits_refunded FROM bg_remover_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'arcano_cloner_jobs' THEN
    SELECT user_id, COALESCE(user_credit_cost, 0), status, COALESCE(credits_charged, false), COALESCE(credits_refunded, false)
    INTO v_user_id, v_credit_cost, v_current_status, v_credits_charged, v_credits_refunded FROM arcano_cloner_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'image_generator_jobs' THEN
    SELECT user_id, COALESCE(user_credit_cost, 0), status, COALESCE(credits_charged, false), COALESCE(credits_refunded, false)
    INTO v_user_id, v_credit_cost, v_current_status, v_credits_charged, v_credits_refunded FROM image_generator_jobs WHERE id = p_job_id;
  ELSE
    RETURN QUERY SELECT FALSE, 0, 'Tabela inválida'::TEXT; RETURN;
  END IF;

  IF v_user_id IS NULL THEN RETURN QUERY SELECT FALSE, 0, 'Job não encontrado'::TEXT; RETURN; END IF;
  IF v_user_id != v_auth_user_id THEN RETURN QUERY SELECT FALSE, 0, 'Sem permissão'::TEXT; RETURN; END IF;
  IF v_current_status NOT IN ('queued', 'pending') THEN RETURN QUERY SELECT FALSE, 0, 'Job não pode ser cancelado (status: ' || v_current_status || ')'::TEXT; RETURN; END IF;

  v_should_refund := v_credits_charged AND NOT v_credits_refunded AND v_credit_cost > 0;

  IF v_should_refund THEN
    PERFORM refund_upscaler_credits(v_user_id, v_credit_cost, 'Cancelamento pelo usuário');
  END IF;

  IF p_table_name = 'upscaler_jobs' THEN
    UPDATE upscaler_jobs SET status = 'cancelled', error_message = 'Cancelado pelo usuário', credits_refunded = CASE WHEN v_should_refund THEN TRUE ELSE credits_refunded END, completed_at = NOW() WHERE id = p_job_id;
  ELSIF p_table_name = 'pose_changer_jobs' THEN
    UPDATE pose_changer_jobs SET status = 'cancelled', error_message = 'Cancelado pelo usuário', credits_refunded = CASE WHEN v_should_refund THEN TRUE ELSE credits_refunded END, completed_at = NOW() WHERE id = p_job_id;
  ELSIF p_table_name = 'veste_ai_jobs' THEN
    UPDATE veste_ai_jobs SET status = 'cancelled', error_message = 'Cancelado pelo usuário', credits_refunded = CASE WHEN v_should_refund THEN TRUE ELSE credits_refunded END, completed_at = NOW() WHERE id = p_job_id;
  ELSIF p_table_name = 'video_upscaler_jobs' THEN
    UPDATE video_upscaler_jobs SET status = 'cancelled', error_message = 'Cancelado pelo usuário', credits_refunded = CASE WHEN v_should_refund THEN TRUE ELSE credits_refunded END, completed_at = NOW() WHERE id = p_job_id;
  ELSIF p_table_name = 'character_generator_jobs' THEN
    UPDATE character_generator_jobs SET status = 'cancelled', error_message = 'Cancelado pelo usuário', credits_refunded = CASE WHEN v_should_refund THEN TRUE ELSE credits_refunded END, completed_at = NOW() WHERE id = p_job_id;
  ELSIF p_table_name = 'flyer_maker_jobs' THEN
    UPDATE flyer_maker_jobs SET status = 'cancelled', error_message = 'Cancelado pelo usuário', credits_refunded = CASE WHEN v_should_refund THEN TRUE ELSE credits_refunded END, completed_at = NOW() WHERE id = p_job_id;
  ELSIF p_table_name = 'bg_remover_jobs' THEN
    UPDATE bg_remover_jobs SET status = 'cancelled', error_message = 'Cancelado pelo usuário', credits_refunded = CASE WHEN v_should_refund THEN TRUE ELSE credits_refunded END, completed_at = NOW() WHERE id = p_job_id;
  ELSIF p_table_name = 'arcano_cloner_jobs' THEN
    UPDATE arcano_cloner_jobs SET status = 'cancelled', error_message = 'Cancelado pelo usuário', credits_refunded = CASE WHEN v_should_refund THEN TRUE ELSE credits_refunded END, completed_at = NOW() WHERE id = p_job_id;
  ELSIF p_table_name = 'image_generator_jobs' THEN
    UPDATE image_generator_jobs SET status = 'cancelled', error_message = 'Cancelado pelo usuário', credits_refunded = CASE WHEN v_should_refund THEN TRUE ELSE credits_refunded END, completed_at = NOW() WHERE id = p_job_id;
  END IF;

  RETURN QUERY SELECT TRUE, CASE WHEN v_should_refund THEN v_credit_cost ELSE 0 END, NULL::TEXT;
END;
$function$;

-- 2. Update mark_pending_job_as_failed to include arcano_cloner_jobs and image_generator_jobs
CREATE OR REPLACE FUNCTION public.mark_pending_job_as_failed(p_table_name text, p_job_id uuid, p_error_message text DEFAULT 'Timeout de inicialização - Edge Function não respondeu'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_current_status TEXT;
  v_auth_user_id UUID;
BEGIN
  v_auth_user_id := auth.uid();
  IF v_auth_user_id IS NULL THEN RETURN FALSE; END IF;

  IF p_table_name = 'upscaler_jobs' THEN
    SELECT user_id, status INTO v_user_id, v_current_status FROM upscaler_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'pose_changer_jobs' THEN
    SELECT user_id, status INTO v_user_id, v_current_status FROM pose_changer_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'veste_ai_jobs' THEN
    SELECT user_id, status INTO v_user_id, v_current_status FROM veste_ai_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'video_upscaler_jobs' THEN
    SELECT user_id, status INTO v_user_id, v_current_status FROM video_upscaler_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'character_generator_jobs' THEN
    SELECT user_id, status INTO v_user_id, v_current_status FROM character_generator_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'flyer_maker_jobs' THEN
    SELECT user_id, status INTO v_user_id, v_current_status FROM flyer_maker_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'bg_remover_jobs' THEN
    SELECT user_id, status INTO v_user_id, v_current_status FROM bg_remover_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'arcano_cloner_jobs' THEN
    SELECT user_id, status INTO v_user_id, v_current_status FROM arcano_cloner_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'image_generator_jobs' THEN
    SELECT user_id, status INTO v_user_id, v_current_status FROM image_generator_jobs WHERE id = p_job_id;
  ELSE
    RETURN FALSE;
  END IF;

  IF v_user_id IS NULL THEN RETURN FALSE; END IF;
  IF v_user_id != v_auth_user_id THEN RETURN FALSE; END IF;
  IF v_current_status != 'pending' THEN RETURN FALSE; END IF;

  IF p_table_name = 'upscaler_jobs' THEN
    UPDATE upscaler_jobs SET status = 'failed', error_message = p_error_message, completed_at = NOW() WHERE id = p_job_id AND status = 'pending';
  ELSIF p_table_name = 'pose_changer_jobs' THEN
    UPDATE pose_changer_jobs SET status = 'failed', error_message = p_error_message, completed_at = NOW() WHERE id = p_job_id AND status = 'pending';
  ELSIF p_table_name = 'veste_ai_jobs' THEN
    UPDATE veste_ai_jobs SET status = 'failed', error_message = p_error_message, completed_at = NOW() WHERE id = p_job_id AND status = 'pending';
  ELSIF p_table_name = 'video_upscaler_jobs' THEN
    UPDATE video_upscaler_jobs SET status = 'failed', error_message = p_error_message, completed_at = NOW() WHERE id = p_job_id AND status = 'pending';
  ELSIF p_table_name = 'character_generator_jobs' THEN
    UPDATE character_generator_jobs SET status = 'failed', error_message = p_error_message, completed_at = NOW() WHERE id = p_job_id AND status = 'pending';
  ELSIF p_table_name = 'flyer_maker_jobs' THEN
    UPDATE flyer_maker_jobs SET status = 'failed', error_message = p_error_message, completed_at = NOW() WHERE id = p_job_id AND status = 'pending';
  ELSIF p_table_name = 'bg_remover_jobs' THEN
    UPDATE bg_remover_jobs SET status = 'failed', error_message = p_error_message, completed_at = NOW() WHERE id = p_job_id AND status = 'pending';
  ELSIF p_table_name = 'arcano_cloner_jobs' THEN
    UPDATE arcano_cloner_jobs SET status = 'failed', error_message = p_error_message, completed_at = NOW() WHERE id = p_job_id AND status = 'pending';
  ELSIF p_table_name = 'image_generator_jobs' THEN
    UPDATE image_generator_jobs SET status = 'failed', error_message = p_error_message, completed_at = NOW() WHERE id = p_job_id AND status = 'pending';
  END IF;

  RETURN TRUE;
END;
$function$;
