-- Função para usuário cancelar seu próprio job e receber estorno
CREATE OR REPLACE FUNCTION public.user_cancel_ai_job(
  p_table_name TEXT,
  p_job_id UUID
)
RETURNS TABLE(success BOOLEAN, refunded_amount INTEGER, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_credit_cost INTEGER;
  v_current_status TEXT;
  v_auth_user_id UUID;
BEGIN
  -- Obter o usuário autenticado
  v_auth_user_id := auth.uid();
  
  IF v_auth_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Usuário não autenticado'::TEXT;
    RETURN;
  END IF;

  -- Buscar job baseado na tabela
  IF p_table_name = 'upscaler_jobs' THEN
    SELECT user_id, COALESCE(user_credit_cost, 0), status 
    INTO v_user_id, v_credit_cost, v_current_status
    FROM upscaler_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'pose_changer_jobs' THEN
    SELECT user_id, COALESCE(user_credit_cost, 0), status 
    INTO v_user_id, v_credit_cost, v_current_status
    FROM pose_changer_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'veste_ai_jobs' THEN
    SELECT user_id, COALESCE(user_credit_cost, 0), status 
    INTO v_user_id, v_credit_cost, v_current_status
    FROM veste_ai_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'video_upscaler_jobs' THEN
    SELECT user_id, COALESCE(user_credit_cost, 0), status 
    INTO v_user_id, v_credit_cost, v_current_status
    FROM video_upscaler_jobs WHERE id = p_job_id;
  ELSE
    RETURN QUERY SELECT FALSE, 0, 'Tabela inválida'::TEXT;
    RETURN;
  END IF;

  -- Verificar se job existe
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Job não encontrado'::TEXT;
    RETURN;
  END IF;

  -- Verificar se o job pertence ao usuário autenticado
  IF v_user_id != v_auth_user_id THEN
    RETURN QUERY SELECT FALSE, 0, 'Você não tem permissão para cancelar este trabalho'::TEXT;
    RETURN;
  END IF;

  -- Verificar se o job pode ser cancelado
  IF v_current_status NOT IN ('running', 'queued') THEN
    RETURN QUERY SELECT FALSE, 0, 'Este trabalho já foi finalizado'::TEXT;
    RETURN;
  END IF;

  -- Estornar créditos se houver
  IF v_credit_cost > 0 THEN
    PERFORM refund_upscaler_credits(v_user_id, v_credit_cost, 
      'Estorno: trabalho cancelado pelo usuário');
  END IF;

  -- Atualizar status do job
  IF p_table_name = 'upscaler_jobs' THEN
    UPDATE upscaler_jobs SET 
      status = 'cancelled',
      error_message = 'Cancelado pelo usuário. Créditos estornados.',
      completed_at = NOW()
    WHERE id = p_job_id;
  ELSIF p_table_name = 'pose_changer_jobs' THEN
    UPDATE pose_changer_jobs SET 
      status = 'cancelled',
      error_message = 'Cancelado pelo usuário. Créditos estornados.',
      completed_at = NOW()
    WHERE id = p_job_id;
  ELSIF p_table_name = 'veste_ai_jobs' THEN
    UPDATE veste_ai_jobs SET 
      status = 'cancelled',
      error_message = 'Cancelado pelo usuário. Créditos estornados.',
      completed_at = NOW()
    WHERE id = p_job_id;
  ELSIF p_table_name = 'video_upscaler_jobs' THEN
    UPDATE video_upscaler_jobs SET 
      status = 'cancelled',
      error_message = 'Cancelado pelo usuário. Créditos estornados.',
      completed_at = NOW()
    WHERE id = p_job_id;
  END IF;

  RETURN QUERY SELECT TRUE, v_credit_cost, NULL::TEXT;
END;
$$;