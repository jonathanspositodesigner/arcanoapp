-- =====================================================
-- CORREÇÃO DO BUG DE ESTORNO EM FALHA DE START
-- 
-- 1) Corrige admin_cancel_job para marcar credits_refunded=true
-- 2) Estorna manualmente os jobs que ficaram sem estorno
-- 3) Corrige flags inconsistentes
-- =====================================================

-- ==============================================
-- 1) CORRIGIR admin_cancel_job para setar credits_refunded=true
-- ==============================================
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
  v_credits_charged BOOLEAN;
  v_credits_refunded BOOLEAN;
BEGIN
  -- Verificar se é admin
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT FALSE, 0, 'Acesso negado: requer permissão de admin'::TEXT;
    RETURN;
  END IF;

  -- Buscar job baseado na tabela (incluindo flags de crédito)
  IF p_table_name = 'upscaler_jobs' THEN
    SELECT user_id, COALESCE(user_credit_cost, 0), status, 
           COALESCE(credits_charged, FALSE), COALESCE(credits_refunded, FALSE)
    INTO v_user_id, v_credit_cost, v_current_status, v_credits_charged, v_credits_refunded
    FROM upscaler_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'pose_changer_jobs' THEN
    SELECT user_id, COALESCE(user_credit_cost, 0), status,
           COALESCE(credits_charged, FALSE), COALESCE(credits_refunded, FALSE)
    INTO v_user_id, v_credit_cost, v_current_status, v_credits_charged, v_credits_refunded
    FROM pose_changer_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'veste_ai_jobs' THEN
    SELECT user_id, COALESCE(user_credit_cost, 0), status,
           COALESCE(credits_charged, FALSE), COALESCE(credits_refunded, FALSE)
    INTO v_user_id, v_credit_cost, v_current_status, v_credits_charged, v_credits_refunded
    FROM veste_ai_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'video_upscaler_jobs' THEN
    SELECT user_id, COALESCE(user_credit_cost, 0), status,
           COALESCE(credits_charged, FALSE), COALESCE(credits_refunded, FALSE)
    INTO v_user_id, v_credit_cost, v_current_status, v_credits_charged, v_credits_refunded
    FROM video_upscaler_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'arcano_cloner_jobs' THEN
    SELECT user_id, COALESCE(user_credit_cost, 0), status,
           COALESCE(credits_charged, FALSE), COALESCE(credits_refunded, FALSE)
    INTO v_user_id, v_credit_cost, v_current_status, v_credits_charged, v_credits_refunded
    FROM arcano_cloner_jobs WHERE id = p_job_id;
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

  -- Estornar créditos SOMENTE se foram cobrados e ainda não foram reembolsados
  IF v_credit_cost > 0 AND v_credits_charged AND NOT v_credits_refunded THEN
    PERFORM refund_upscaler_credits(v_user_id, v_credit_cost, 
      'Estorno manual: job cancelado pelo admin');
  ELSE
    -- Zerar o custo se não houver estorno a fazer
    v_credit_cost := 0;
  END IF;

  -- Atualizar status do job COM credits_refunded=true
  IF p_table_name = 'upscaler_jobs' THEN
    UPDATE upscaler_jobs SET 
      status = 'cancelled',
      credits_refunded = CASE WHEN v_credit_cost > 0 THEN TRUE ELSE credits_refunded END,
      error_message = 'Cancelado manualmente pelo administrador. Créditos estornados.',
      completed_at = NOW()
    WHERE id = p_job_id;
  ELSIF p_table_name = 'pose_changer_jobs' THEN
    UPDATE pose_changer_jobs SET 
      status = 'cancelled',
      credits_refunded = CASE WHEN v_credit_cost > 0 THEN TRUE ELSE credits_refunded END,
      error_message = 'Cancelado manualmente pelo administrador. Créditos estornados.',
      completed_at = NOW()
    WHERE id = p_job_id;
  ELSIF p_table_name = 'veste_ai_jobs' THEN
    UPDATE veste_ai_jobs SET 
      status = 'cancelled',
      credits_refunded = CASE WHEN v_credit_cost > 0 THEN TRUE ELSE credits_refunded END,
      error_message = 'Cancelado manualmente pelo administrador. Créditos estornados.',
      completed_at = NOW()
    WHERE id = p_job_id;
  ELSIF p_table_name = 'video_upscaler_jobs' THEN
    UPDATE video_upscaler_jobs SET 
      status = 'cancelled',
      credits_refunded = CASE WHEN v_credit_cost > 0 THEN TRUE ELSE credits_refunded END,
      error_message = 'Cancelado manualmente pelo administrador. Créditos estornados.',
      completed_at = NOW()
    WHERE id = p_job_id;
  ELSIF p_table_name = 'arcano_cloner_jobs' THEN
    UPDATE arcano_cloner_jobs SET 
      status = 'cancelled',
      credits_refunded = CASE WHEN v_credit_cost > 0 THEN TRUE ELSE credits_refunded END,
      error_message = 'Cancelado manualmente pelo administrador. Créditos estornados.',
      completed_at = NOW()
    WHERE id = p_job_id;
  END IF;

  RETURN QUERY SELECT TRUE, v_credit_cost, NULL::TEXT;
END;
$$;

-- ==============================================
-- 2) ESTORNO MANUAL DO JOB DO VINNY 
-- Job: fa49805e-c52c-461e-9c8d-78bf5542c433
-- User: 858e37be-... (vinnynunesrio@gmail.com)
-- ==============================================
DO $$
DECLARE
  v_user_id UUID;
  v_credit_cost INTEGER;
  v_is_refunded BOOLEAN;
BEGIN
  -- Buscar dados do job do Vinny
  SELECT user_id, COALESCE(user_credit_cost, 0), COALESCE(credits_refunded, FALSE)
  INTO v_user_id, v_credit_cost, v_is_refunded
  FROM upscaler_jobs
  WHERE id = 'fa49805e-c52c-461e-9c8d-78bf5542c433';
  
  -- Só estornar se ainda não foi estornado
  IF v_user_id IS NOT NULL AND v_credit_cost > 0 AND NOT v_is_refunded THEN
    -- Estornar créditos
    PERFORM refund_upscaler_credits(v_user_id, v_credit_cost, 
      'Estorno manual: falha RunningHub (sem conclusão de webhook)');
    
    -- Marcar como estornado
    UPDATE upscaler_jobs 
    SET credits_refunded = TRUE,
        error_message = COALESCE(error_message, '') || ' [Estornado manualmente em ' || NOW()::TEXT || ']'
    WHERE id = 'fa49805e-c52c-461e-9c8d-78bf5542c433';
    
    RAISE NOTICE 'Vinny job estornado: % créditos para user %', v_credit_cost, v_user_id;
  ELSE
    RAISE NOTICE 'Vinny job: nenhum estorno necessário (já estornado ou sem custo)';
  END IF;
END;
$$;

-- ==============================================
-- 3) ESTORNO RETROATIVO: jobs failed sem task_id
-- Estes jobs falharam no START e nunca tiveram webhook
-- ==============================================
DO $$
DECLARE
  r RECORD;
  v_total_refunded INTEGER := 0;
BEGIN
  -- Buscar todos os jobs failed sem task_id que foram cobrados mas não estornados
  FOR r IN 
    SELECT id, user_id, user_credit_cost
    FROM upscaler_jobs
    WHERE status = 'failed'
      AND task_id IS NULL
      AND credits_charged = TRUE
      AND (credits_refunded IS NULL OR credits_refunded = FALSE)
      AND COALESCE(user_credit_cost, 0) > 0
  LOOP
    -- Estornar
    PERFORM refund_upscaler_credits(r.user_id, r.user_credit_cost, 
      'Estorno automático: falha no início (sem task_id)');
    
    -- Marcar como estornado
    UPDATE upscaler_jobs 
    SET credits_refunded = TRUE,
        error_message = COALESCE(error_message, 'START_FAILED') || ' [Estornado automaticamente em ' || NOW()::TEXT || ']'
    WHERE id = r.id;
    
    v_total_refunded := v_total_refunded + 1;
    RAISE NOTICE 'Job % estornado: % créditos para user %', r.id, r.user_credit_cost, r.user_id;
  END LOOP;
  
  RAISE NOTICE 'Total de jobs estornados retroativamente: %', v_total_refunded;
END;
$$;

-- ==============================================
-- 4) CORRIGIR FLAG do job do Jonathan
-- Job: 6b46e502-727e-4160-950b-7cf912d6201b
-- (já tem transação de refund +80, só precisa corrigir o flag)
-- ==============================================
UPDATE upscaler_jobs 
SET credits_refunded = TRUE
WHERE id = '6b46e502-727e-4160-950b-7cf912d6201b'
  AND credits_refunded = FALSE;

-- Log da correção
DO $$ BEGIN RAISE NOTICE 'Flag do job Jonathan corrigido se estava FALSE'; END; $$;