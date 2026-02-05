-- Atualizar RPC para NÃO reembolsar jobs que já iniciaram na RunningHub
CREATE OR REPLACE FUNCTION public.user_cancel_ai_job(p_table_name TEXT, p_job_id UUID)
RETURNS TABLE(success BOOLEAN, refunded_amount INTEGER, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  IF v_auth_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Usuário não autenticado'::TEXT;
    RETURN;
  END IF;

  -- Buscar job baseado na tabela
  IF p_table_name = 'upscaler_jobs' THEN
    SELECT user_id, COALESCE(user_credit_cost, 0), status, 
           COALESCE(credits_charged, false), COALESCE(credits_refunded, false)
    INTO v_user_id, v_credit_cost, v_current_status, v_credits_charged, v_credits_refunded
    FROM upscaler_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'pose_changer_jobs' THEN
    SELECT user_id, COALESCE(user_credit_cost, 0), status,
           COALESCE(credits_charged, false), COALESCE(credits_refunded, false)
    INTO v_user_id, v_credit_cost, v_current_status, v_credits_charged, v_credits_refunded
    FROM pose_changer_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'veste_ai_jobs' THEN
    SELECT user_id, COALESCE(user_credit_cost, 0), status,
           COALESCE(credits_charged, false), COALESCE(credits_refunded, false)
    INTO v_user_id, v_credit_cost, v_current_status, v_credits_charged, v_credits_refunded
    FROM veste_ai_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'video_upscaler_jobs' THEN
    SELECT user_id, COALESCE(user_credit_cost, 0), status,
           COALESCE(credits_charged, false), COALESCE(credits_refunded, false)
    INTO v_user_id, v_credit_cost, v_current_status, v_credits_charged, v_credits_refunded
    FROM video_upscaler_jobs WHERE id = p_job_id;
  ELSE
    RETURN QUERY SELECT FALSE, 0, 'Tabela inválida'::TEXT;
    RETURN;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Job não encontrado'::TEXT;
    RETURN;
  END IF;

  IF v_user_id != v_auth_user_id THEN
    RETURN QUERY SELECT FALSE, 0, 'Você não tem permissão para cancelar este trabalho'::TEXT;
    RETURN;
  END IF;

  -- Incluir STARTING nos status canceláveis
  IF v_current_status NOT IN ('running', 'queued', 'starting') THEN
    RETURN QUERY SELECT FALSE, 0, 'Este trabalho já foi finalizado'::TEXT;
    RETURN;
  END IF;

  -- NOVA LÓGICA: Só reembolsa se está na FILA (queued)
  -- Se já está running ou starting, a RunningHub já está cobrando, então NÃO reembolsa
  v_should_refund := v_current_status = 'queued' 
                     AND v_credits_charged = true 
                     AND v_credits_refunded = false 
                     AND v_credit_cost > 0;
  
  IF v_should_refund THEN
    PERFORM refund_upscaler_credits(v_user_id, v_credit_cost, 
      'Estorno: trabalho cancelado pelo usuário (ainda na fila)');
  ELSE
    v_credit_cost := 0; -- Não reembolsou nada
  END IF;

  -- Atualizar status do job + marcar como reembolsado (ou não)
  IF p_table_name = 'upscaler_jobs' THEN
    UPDATE upscaler_jobs SET 
      status = 'cancelled',
      error_message = CASE 
        WHEN v_should_refund THEN 'Cancelado pelo usuário. Créditos estornados.'
        ELSE 'Cancelado pelo usuário. Créditos não devolvidos (processamento já iniciado).'
      END,
      completed_at = NOW(),
      credits_refunded = v_should_refund
    WHERE id = p_job_id;
  ELSIF p_table_name = 'pose_changer_jobs' THEN
    UPDATE pose_changer_jobs SET 
      status = 'cancelled',
      error_message = CASE 
        WHEN v_should_refund THEN 'Cancelado pelo usuário. Créditos estornados.'
        ELSE 'Cancelado pelo usuário. Créditos não devolvidos (processamento já iniciado).'
      END,
      completed_at = NOW(),
      credits_refunded = v_should_refund
    WHERE id = p_job_id;
  ELSIF p_table_name = 'veste_ai_jobs' THEN
    UPDATE veste_ai_jobs SET 
      status = 'cancelled',
      error_message = CASE 
        WHEN v_should_refund THEN 'Cancelado pelo usuário. Créditos estornados.'
        ELSE 'Cancelado pelo usuário. Créditos não devolvidos (processamento já iniciado).'
      END,
      completed_at = NOW(),
      credits_refunded = v_should_refund
    WHERE id = p_job_id;
  ELSIF p_table_name = 'video_upscaler_jobs' THEN
    UPDATE video_upscaler_jobs SET 
      status = 'cancelled',
      error_message = CASE 
        WHEN v_should_refund THEN 'Cancelado pelo usuário. Créditos estornados.'
        ELSE 'Cancelado pelo usuário. Créditos não devolvidos (processamento já iniciado).'
      END,
      completed_at = NOW(),
      credits_refunded = v_should_refund
    WHERE id = p_job_id;
  END IF;

  RETURN QUERY SELECT TRUE, v_credit_cost, NULL::TEXT;
END;
$$;