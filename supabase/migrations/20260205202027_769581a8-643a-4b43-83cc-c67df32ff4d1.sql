-- =============================================
-- FASE B: Adicionar flags de controle financeiro e configuração
-- para suportar centralização correta dos jobs de IA
-- =============================================

-- 1) Adicionar colunas de controle financeiro em TODAS as tabelas de jobs
-- Estas flags garantem reembolso idempotente (nunca duplica)

-- upscaler_jobs
ALTER TABLE public.upscaler_jobs 
  ADD COLUMN IF NOT EXISTS credits_charged boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS credits_refunded boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS job_payload jsonb;

-- pose_changer_jobs
ALTER TABLE public.pose_changer_jobs 
  ADD COLUMN IF NOT EXISTS credits_charged boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS credits_refunded boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS job_payload jsonb;

-- veste_ai_jobs
ALTER TABLE public.veste_ai_jobs 
  ADD COLUMN IF NOT EXISTS credits_charged boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS credits_refunded boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS job_payload jsonb;

-- video_upscaler_jobs
ALTER TABLE public.video_upscaler_jobs 
  ADD COLUMN IF NOT EXISTS credits_charged boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS credits_refunded boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS job_payload jsonb;

-- 2) Upscaler: persistir config necessária para iniciar a partir da fila
-- Esses campos garantem que o queue manager consiga re-iniciar jobs de fila
ALTER TABLE public.upscaler_jobs 
  ADD COLUMN IF NOT EXISTS version text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS framing_mode text,
  ADD COLUMN IF NOT EXISTS resolution text,
  ADD COLUMN IF NOT EXISTS input_url text;

-- 3) Pose Changer e Veste AI: persistir URLs das imagens (não apenas nomes)
ALTER TABLE public.pose_changer_jobs 
  ADD COLUMN IF NOT EXISTS person_image_url text,
  ADD COLUMN IF NOT EXISTS reference_image_url text;

ALTER TABLE public.veste_ai_jobs 
  ADD COLUMN IF NOT EXISTS person_image_url text,
  ADD COLUMN IF NOT EXISTS clothing_image_url text;

-- 4) Video Upscaler: persistir URL do vídeo
ALTER TABLE public.video_upscaler_jobs 
  ADD COLUMN IF NOT EXISTS video_url text;

-- 5) Atualizar a função cleanup_all_stale_ai_jobs para respeitar credits_charged/credits_refunded
CREATE OR REPLACE FUNCTION public.cleanup_all_stale_ai_jobs()
RETURNS TABLE(table_name text, cancelled_count integer, refunded_credits integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  -- 1. Limpar upscaler_jobs (incluir STARTING no status)
  FOR job IN 
    SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded 
    FROM upscaler_jobs 
    WHERE status IN ('running', 'queued', 'starting') 
    AND created_at < NOW() - stale_threshold
  LOOP
    -- Só reembolsa se foi cobrado E ainda não foi reembolsado
    IF COALESCE(job.credits_charged, false) = true 
       AND COALESCE(job.credits_refunded, false) = false
       AND COALESCE(job.user_credit_cost, 0) > 0 
       AND job.user_id IS NOT NULL THEN
      PERFORM refund_upscaler_credits(job.user_id, job.user_credit_cost, 
        'Estorno automático: timeout após 10 minutos');
      upscaler_refunded := upscaler_refunded + job.user_credit_cost;
      
      -- Marcar como reembolsado para nunca duplicar
      UPDATE upscaler_jobs SET credits_refunded = true WHERE id = job.id;
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
    SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded 
    FROM pose_changer_jobs 
    WHERE status IN ('running', 'queued', 'starting') 
    AND created_at < NOW() - stale_threshold
  LOOP
    IF COALESCE(job.credits_charged, false) = true 
       AND COALESCE(job.credits_refunded, false) = false
       AND COALESCE(job.user_credit_cost, 0) > 0 
       AND job.user_id IS NOT NULL THEN
      PERFORM refund_upscaler_credits(job.user_id, job.user_credit_cost, 
        'Estorno automático: timeout após 10 minutos');
      pose_refunded := pose_refunded + job.user_credit_cost;
      UPDATE pose_changer_jobs SET credits_refunded = true WHERE id = job.id;
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
    SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded 
    FROM veste_ai_jobs 
    WHERE status IN ('running', 'queued', 'starting') 
    AND created_at < NOW() - stale_threshold
  LOOP
    IF COALESCE(job.credits_charged, false) = true 
       AND COALESCE(job.credits_refunded, false) = false
       AND COALESCE(job.user_credit_cost, 0) > 0 
       AND job.user_id IS NOT NULL THEN
      PERFORM refund_upscaler_credits(job.user_id, job.user_credit_cost, 
        'Estorno automático: timeout após 10 minutos');
      veste_refunded := veste_refunded + job.user_credit_cost;
      UPDATE veste_ai_jobs SET credits_refunded = true WHERE id = job.id;
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
    SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded 
    FROM video_upscaler_jobs 
    WHERE status IN ('running', 'queued', 'starting') 
    AND created_at < NOW() - stale_threshold
  LOOP
    IF COALESCE(job.credits_charged, false) = true 
       AND COALESCE(job.credits_refunded, false) = false
       AND COALESCE(job.user_credit_cost, 0) > 0 
       AND job.user_id IS NOT NULL THEN
      PERFORM refund_upscaler_credits(job.user_id, job.user_credit_cost, 
        'Estorno automático: timeout após 10 minutos');
      video_refunded := video_refunded + job.user_credit_cost;
      UPDATE video_upscaler_jobs SET credits_refunded = true WHERE id = job.id;
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

-- 6) Atualizar user_cancel_ai_job para ser idempotente com credits_charged/credits_refunded
CREATE OR REPLACE FUNCTION public.user_cancel_ai_job(p_table_name text, p_job_id uuid)
RETURNS TABLE(success boolean, refunded_amount integer, error_message text)
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

  -- Só reembolsa se foi cobrado E ainda não foi reembolsado (idempotente)
  IF v_credits_charged = true AND v_credits_refunded = false AND v_credit_cost > 0 THEN
    PERFORM refund_upscaler_credits(v_user_id, v_credit_cost, 
      'Estorno: trabalho cancelado pelo usuário');
  ELSE
    v_credit_cost := 0; -- Não reembolsou nada
  END IF;

  -- Atualizar status do job + marcar como reembolsado
  IF p_table_name = 'upscaler_jobs' THEN
    UPDATE upscaler_jobs SET 
      status = 'cancelled',
      error_message = 'Cancelado pelo usuário. Créditos estornados.',
      completed_at = NOW(),
      credits_refunded = true
    WHERE id = p_job_id;
  ELSIF p_table_name = 'pose_changer_jobs' THEN
    UPDATE pose_changer_jobs SET 
      status = 'cancelled',
      error_message = 'Cancelado pelo usuário. Créditos estornados.',
      completed_at = NOW(),
      credits_refunded = true
    WHERE id = p_job_id;
  ELSIF p_table_name = 'veste_ai_jobs' THEN
    UPDATE veste_ai_jobs SET 
      status = 'cancelled',
      error_message = 'Cancelado pelo usuário. Créditos estornados.',
      completed_at = NOW(),
      credits_refunded = true
    WHERE id = p_job_id;
  ELSIF p_table_name = 'video_upscaler_jobs' THEN
    UPDATE video_upscaler_jobs SET 
      status = 'cancelled',
      error_message = 'Cancelado pelo usuário. Créditos estornados.',
      completed_at = NOW(),
      credits_refunded = true
    WHERE id = p_job_id;
  END IF;

  RETURN QUERY SELECT TRUE, v_credit_cost, NULL::TEXT;
END;
$$;