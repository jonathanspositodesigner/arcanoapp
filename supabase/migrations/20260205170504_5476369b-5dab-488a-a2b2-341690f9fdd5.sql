-- Função para limpar jobs presos em todas as tabelas de AI tools
CREATE OR REPLACE FUNCTION public.cleanup_all_stale_ai_jobs()
RETURNS TABLE(table_name TEXT, cancelled_count INTEGER, refunded_credits INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  job RECORD;
  upscaler_cancelled INTEGER := 0;
  upscaler_refunded INTEGER := 0;
  pose_cancelled INTEGER := 0;
  pose_refunded INTEGER := 0;
  veste_cancelled INTEGER := 0;
  veste_refunded INTEGER := 0;
  video_cancelled INTEGER := 0;
  video_refunded INTEGER := 0;
  stale_threshold INTERVAL := INTERVAL '10 minutes';
BEGIN
  -- 1. Limpar upscaler_jobs
  FOR job IN 
    SELECT id, user_id, user_credit_cost 
    FROM upscaler_jobs 
    WHERE status IN ('running', 'queued') 
    AND created_at < NOW() - stale_threshold
  LOOP
    IF COALESCE(job.user_credit_cost, 0) > 0 AND job.user_id IS NOT NULL THEN
      PERFORM refund_upscaler_credits(job.user_id, job.user_credit_cost, 
        'Estorno automático: timeout após 10 minutos');
      upscaler_refunded := upscaler_refunded + job.user_credit_cost;
    END IF;
    
    UPDATE upscaler_jobs SET 
      status = 'failed',
      error_message = 'Trabalho cancelado automaticamente após 10 minutos. Créditos estornados.',
      completed_at = NOW()
    WHERE id = job.id;
    
    upscaler_cancelled := upscaler_cancelled + 1;
  END LOOP;
  
  table_name := 'upscaler_jobs';
  cancelled_count := upscaler_cancelled;
  refunded_credits := upscaler_refunded;
  RETURN NEXT;

  -- 2. Limpar pose_changer_jobs
  FOR job IN 
    SELECT id, user_id, user_credit_cost 
    FROM pose_changer_jobs 
    WHERE status IN ('running', 'queued') 
    AND created_at < NOW() - stale_threshold
  LOOP
    IF COALESCE(job.user_credit_cost, 0) > 0 AND job.user_id IS NOT NULL THEN
      PERFORM refund_upscaler_credits(job.user_id, job.user_credit_cost, 
        'Estorno automático: timeout após 10 minutos');
      pose_refunded := pose_refunded + job.user_credit_cost;
    END IF;
    
    UPDATE pose_changer_jobs SET 
      status = 'failed',
      error_message = 'Trabalho cancelado automaticamente após 10 minutos. Créditos estornados.',
      completed_at = NOW()
    WHERE id = job.id;
    
    pose_cancelled := pose_cancelled + 1;
  END LOOP;
  
  table_name := 'pose_changer_jobs';
  cancelled_count := pose_cancelled;
  refunded_credits := pose_refunded;
  RETURN NEXT;

  -- 3. Limpar veste_ai_jobs
  FOR job IN 
    SELECT id, user_id, user_credit_cost 
    FROM veste_ai_jobs 
    WHERE status IN ('running', 'queued') 
    AND created_at < NOW() - stale_threshold
  LOOP
    IF COALESCE(job.user_credit_cost, 0) > 0 AND job.user_id IS NOT NULL THEN
      PERFORM refund_upscaler_credits(job.user_id, job.user_credit_cost, 
        'Estorno automático: timeout após 10 minutos');
      veste_refunded := veste_refunded + job.user_credit_cost;
    END IF;
    
    UPDATE veste_ai_jobs SET 
      status = 'failed',
      error_message = 'Trabalho cancelado automaticamente após 10 minutos. Créditos estornados.',
      completed_at = NOW()
    WHERE id = job.id;
    
    veste_cancelled := veste_cancelled + 1;
  END LOOP;
  
  table_name := 'veste_ai_jobs';
  cancelled_count := veste_cancelled;
  refunded_credits := veste_refunded;
  RETURN NEXT;

  -- 4. Limpar video_upscaler_jobs
  FOR job IN 
    SELECT id, user_id, user_credit_cost 
    FROM video_upscaler_jobs 
    WHERE status IN ('running', 'queued') 
    AND created_at < NOW() - stale_threshold
  LOOP
    IF COALESCE(job.user_credit_cost, 0) > 0 AND job.user_id IS NOT NULL THEN
      PERFORM refund_upscaler_credits(job.user_id, job.user_credit_cost, 
        'Estorno automático: timeout após 10 minutos');
      video_refunded := video_refunded + job.user_credit_cost;
    END IF;
    
    UPDATE video_upscaler_jobs SET 
      status = 'failed',
      error_message = 'Trabalho cancelado automaticamente após 10 minutos. Créditos estornados.',
      completed_at = NOW()
    WHERE id = job.id;
    
    video_cancelled := video_cancelled + 1;
  END LOOP;
  
  table_name := 'video_upscaler_jobs';
  cancelled_count := video_cancelled;
  refunded_credits := video_refunded;
  RETURN NEXT;
END;
$$;

-- Função para cancelar um job específico manualmente (admin)
CREATE OR REPLACE FUNCTION public.admin_cancel_job(
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
BEGIN
  -- Verificar se é admin
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT FALSE, 0, 'Acesso negado: requer permissão de admin'::TEXT;
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

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Job não encontrado'::TEXT;
    RETURN;
  END IF;

  IF v_current_status NOT IN ('running', 'queued') THEN
    RETURN QUERY SELECT FALSE, 0, 'Job já finalizado, não pode ser cancelado'::TEXT;
    RETURN;
  END IF;

  -- Estornar créditos se houver
  IF v_credit_cost > 0 THEN
    PERFORM refund_upscaler_credits(v_user_id, v_credit_cost, 
      'Estorno manual: job cancelado pelo admin');
  END IF;

  -- Atualizar status do job
  IF p_table_name = 'upscaler_jobs' THEN
    UPDATE upscaler_jobs SET 
      status = 'cancelled',
      error_message = 'Cancelado manualmente pelo administrador. Créditos estornados.',
      completed_at = NOW()
    WHERE id = p_job_id;
  ELSIF p_table_name = 'pose_changer_jobs' THEN
    UPDATE pose_changer_jobs SET 
      status = 'cancelled',
      error_message = 'Cancelado manualmente pelo administrador. Créditos estornados.',
      completed_at = NOW()
    WHERE id = p_job_id;
  ELSIF p_table_name = 'veste_ai_jobs' THEN
    UPDATE veste_ai_jobs SET 
      status = 'cancelled',
      error_message = 'Cancelado manualmente pelo administrador. Créditos estornados.',
      completed_at = NOW()
    WHERE id = p_job_id;
  ELSIF p_table_name = 'video_upscaler_jobs' THEN
    UPDATE video_upscaler_jobs SET 
      status = 'cancelled',
      error_message = 'Cancelado manualmente pelo administrador. Créditos estornados.',
      completed_at = NOW()
    WHERE id = p_job_id;
  END IF;

  RETURN QUERY SELECT TRUE, v_credit_cost, NULL::TEXT;
END;
$$;