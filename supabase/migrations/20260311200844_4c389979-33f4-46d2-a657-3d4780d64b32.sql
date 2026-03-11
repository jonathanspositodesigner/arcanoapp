
-- =====================================================
-- BG REMOVER JOBS TABLE + ALL RPC UPDATES
-- =====================================================

-- 1. Create bg_remover_jobs table
CREATE TABLE public.bg_remover_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  task_id TEXT,
  api_account TEXT NOT NULL DEFAULT 'primary',
  input_url TEXT,
  input_file_name TEXT,
  output_url TEXT,
  thumbnail_url TEXT,
  error_message TEXT,
  position INTEGER,
  credits_charged BOOLEAN DEFAULT false,
  credits_refunded BOOLEAN DEFAULT false,
  user_credit_cost INTEGER,
  rh_cost INTEGER,
  current_step TEXT,
  failed_at_step TEXT,
  step_history JSONB,
  raw_api_response JSONB,
  raw_webhook_payload JSONB,
  job_payload JSONB,
  waited_in_queue BOOLEAN DEFAULT false,
  queue_wait_seconds INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS
ALTER TABLE public.bg_remover_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bg_remover_jobs"
  ON public.bg_remover_jobs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own bg_remover_jobs"
  ON public.bg_remover_jobs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own bg_remover_jobs"
  ON public.bg_remover_jobs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Service role needs full access for webhooks/queue manager
CREATE POLICY "Service role full access bg_remover_jobs"
  ON public.bg_remover_jobs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bg_remover_jobs;

-- 4. Update cleanup_all_stale_ai_jobs to include bg_remover_jobs
CREATE OR REPLACE FUNCTION public.cleanup_all_stale_ai_jobs()
 RETURNS TABLE(table_name text, cancelled_count integer, refunded_credits integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  job RECORD;
  refund_result RECORD;
  upscaler_cancelled INTEGER := 0;
  upscaler_refunded INTEGER := 0;
  pose_cancelled INTEGER := 0;
  pose_refunded INTEGER := 0;
  veste_cancelled INTEGER := 0;
  veste_refunded INTEGER := 0;
  video_cancelled INTEGER := 0;
  video_refunded INTEGER := 0;
  arcano_cancelled INTEGER := 0;
  arcano_refunded INTEGER := 0;
  chargen_cancelled INTEGER := 0;
  chargen_refunded INTEGER := 0;
  flyer_cancelled INTEGER := 0;
  flyer_refunded INTEGER := 0;
  bgremover_cancelled INTEGER := 0;
  bgremover_refunded INTEGER := 0;
  stale_threshold INTERVAL := INTERVAL '10 minutes';
BEGIN
  -- UPSCALER JOBS
  FOR job IN 
    SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded 
    FROM upscaler_jobs 
    WHERE status IN ('running', 'queued', 'starting', 'pending')
    AND created_at < NOW() - stale_threshold
  LOOP
    UPDATE upscaler_jobs SET status = 'failed', error_message = 'Job timed out - cancelled automatically after 10 minutes', completed_at = NOW() WHERE id = job.id;
    upscaler_cancelled := upscaler_cancelled + 1;
    IF job.credits_charged = TRUE AND job.credits_refunded IS NOT TRUE AND job.user_id IS NOT NULL AND job.user_credit_cost > 0 THEN
      SELECT * INTO refund_result FROM refund_upscaler_credits(job.user_id, job.user_credit_cost, 'Estorno automático: timeout após 10 minutos');
      IF refund_result.success THEN UPDATE upscaler_jobs SET credits_refunded = TRUE WHERE id = job.id; upscaler_refunded := upscaler_refunded + job.user_credit_cost; END IF;
    END IF;
  END LOOP;

  -- POSE CHANGER JOBS
  FOR job IN 
    SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded 
    FROM pose_changer_jobs 
    WHERE status IN ('running', 'queued', 'starting', 'pending')
    AND created_at < NOW() - stale_threshold
  LOOP
    UPDATE pose_changer_jobs SET status = 'failed', error_message = 'Job timed out - cancelled automatically after 10 minutes', completed_at = NOW() WHERE id = job.id;
    pose_cancelled := pose_cancelled + 1;
    IF job.credits_charged = TRUE AND job.credits_refunded IS NOT TRUE AND job.user_id IS NOT NULL AND job.user_credit_cost > 0 THEN
      SELECT * INTO refund_result FROM refund_upscaler_credits(job.user_id, job.user_credit_cost, 'Estorno automático: timeout após 10 minutos (Pose Changer)');
      IF refund_result.success THEN UPDATE pose_changer_jobs SET credits_refunded = TRUE WHERE id = job.id; pose_refunded := pose_refunded + job.user_credit_cost; END IF;
    END IF;
  END LOOP;

  -- VESTE AI JOBS
  FOR job IN 
    SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded 
    FROM veste_ai_jobs 
    WHERE status IN ('running', 'queued', 'starting', 'pending')
    AND created_at < NOW() - stale_threshold
  LOOP
    UPDATE veste_ai_jobs SET status = 'failed', error_message = 'Job timed out - cancelled automatically after 10 minutes', completed_at = NOW() WHERE id = job.id;
    veste_cancelled := veste_cancelled + 1;
    IF job.credits_charged = TRUE AND job.credits_refunded IS NOT TRUE AND job.user_id IS NOT NULL AND job.user_credit_cost > 0 THEN
      SELECT * INTO refund_result FROM refund_upscaler_credits(job.user_id, job.user_credit_cost, 'Estorno automático: timeout após 10 minutos (Veste AI)');
      IF refund_result.success THEN UPDATE veste_ai_jobs SET credits_refunded = TRUE WHERE id = job.id; veste_refunded := veste_refunded + job.user_credit_cost; END IF;
    END IF;
  END LOOP;

  -- VIDEO UPSCALER JOBS
  FOR job IN 
    SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded 
    FROM video_upscaler_jobs 
    WHERE status IN ('running', 'queued', 'starting', 'pending')
    AND created_at < NOW() - stale_threshold
  LOOP
    UPDATE video_upscaler_jobs SET status = 'failed', error_message = 'Job timed out - cancelled automatically after 10 minutes', completed_at = NOW() WHERE id = job.id;
    video_cancelled := video_cancelled + 1;
    IF job.credits_charged = TRUE AND job.credits_refunded IS NOT TRUE AND job.user_id IS NOT NULL AND job.user_credit_cost > 0 THEN
      SELECT * INTO refund_result FROM refund_upscaler_credits(job.user_id, job.user_credit_cost, 'Estorno automático: timeout após 10 minutos (Video Upscaler)');
      IF refund_result.success THEN UPDATE video_upscaler_jobs SET credits_refunded = TRUE WHERE id = job.id; video_refunded := video_refunded + job.user_credit_cost; END IF;
    END IF;
  END LOOP;

  -- ARCANO CLONER JOBS
  FOR job IN 
    SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded 
    FROM arcano_cloner_jobs 
    WHERE status IN ('running', 'queued', 'starting', 'pending')
    AND created_at < NOW() - stale_threshold
  LOOP
    UPDATE arcano_cloner_jobs SET status = 'failed', error_message = 'Job timed out - cancelled automatically after 10 minutes', completed_at = NOW() WHERE id = job.id;
    arcano_cancelled := arcano_cancelled + 1;
    IF job.credits_charged = TRUE AND job.credits_refunded IS NOT TRUE AND job.user_id IS NOT NULL AND job.user_credit_cost > 0 THEN
      SELECT * INTO refund_result FROM refund_upscaler_credits(job.user_id, job.user_credit_cost, 'Estorno automático: timeout após 10 minutos (Arcano Cloner)');
      IF refund_result.success THEN UPDATE arcano_cloner_jobs SET credits_refunded = TRUE WHERE id = job.id; arcano_refunded := arcano_refunded + job.user_credit_cost; END IF;
    END IF;
  END LOOP;

  -- CHARACTER GENERATOR JOBS
  FOR job IN 
    SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded 
    FROM character_generator_jobs 
    WHERE status IN ('running', 'queued', 'starting', 'pending')
    AND created_at < NOW() - stale_threshold
  LOOP
    UPDATE character_generator_jobs SET status = 'failed', error_message = 'Job timed out - cancelled automatically after 10 minutes', completed_at = NOW() WHERE id = job.id;
    chargen_cancelled := chargen_cancelled + 1;
    IF job.credits_charged = TRUE AND job.credits_refunded IS NOT TRUE AND job.user_id IS NOT NULL AND job.user_credit_cost > 0 THEN
      SELECT * INTO refund_result FROM refund_upscaler_credits(job.user_id, job.user_credit_cost, 'Estorno automático: timeout após 10 minutos (Character Generator)');
      IF refund_result.success THEN UPDATE character_generator_jobs SET credits_refunded = TRUE WHERE id = job.id; chargen_refunded := chargen_refunded + job.user_credit_cost; END IF;
    END IF;
  END LOOP;

  -- FLYER MAKER JOBS
  FOR job IN 
    SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded 
    FROM flyer_maker_jobs 
    WHERE status IN ('running', 'queued', 'starting', 'pending')
    AND created_at < NOW() - stale_threshold
  LOOP
    UPDATE flyer_maker_jobs SET status = 'failed', error_message = 'Job timed out - cancelled automatically after 10 minutes', completed_at = NOW() WHERE id = job.id;
    flyer_cancelled := flyer_cancelled + 1;
    IF job.credits_charged = TRUE AND job.credits_refunded IS NOT TRUE AND job.user_id IS NOT NULL AND job.user_credit_cost > 0 THEN
      SELECT * INTO refund_result FROM refund_upscaler_credits(job.user_id, job.user_credit_cost, 'Estorno automático: timeout após 10 minutos (Flyer Maker)');
      IF refund_result.success THEN UPDATE flyer_maker_jobs SET credits_refunded = TRUE WHERE id = job.id; flyer_refunded := flyer_refunded + job.user_credit_cost; END IF;
    END IF;
  END LOOP;

  -- BG REMOVER JOBS (NEW)
  FOR job IN 
    SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded 
    FROM bg_remover_jobs 
    WHERE status IN ('running', 'queued', 'starting', 'pending')
    AND created_at < NOW() - stale_threshold
  LOOP
    UPDATE bg_remover_jobs SET status = 'failed', error_message = 'Job timed out - cancelled automatically after 10 minutes', completed_at = NOW() WHERE id = job.id;
    bgremover_cancelled := bgremover_cancelled + 1;
    IF job.credits_charged = TRUE AND job.credits_refunded IS NOT TRUE AND job.user_id IS NOT NULL AND job.user_credit_cost > 0 THEN
      SELECT * INTO refund_result FROM refund_upscaler_credits(job.user_id, job.user_credit_cost, 'Estorno automático: timeout após 10 minutos (Remover Fundo)');
      IF refund_result.success THEN UPDATE bg_remover_jobs SET credits_refunded = TRUE WHERE id = job.id; bgremover_refunded := bgremover_refunded + job.user_credit_cost; END IF;
    END IF;
  END LOOP;

  RETURN QUERY VALUES 
    ('upscaler_jobs', upscaler_cancelled, upscaler_refunded),
    ('pose_changer_jobs', pose_cancelled, pose_refunded),
    ('veste_ai_jobs', veste_cancelled, veste_refunded),
    ('video_upscaler_jobs', video_cancelled, video_refunded),
    ('arcano_cloner_jobs', arcano_cancelled, arcano_refunded),
    ('character_generator_jobs', chargen_cancelled, chargen_refunded),
    ('flyer_maker_jobs', flyer_cancelled, flyer_refunded),
    ('bg_remover_jobs', bgremover_cancelled, bgremover_refunded);
END;
$function$;

-- 5. Update mark_pending_job_as_failed to include bg_remover_jobs
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
  END IF;

  RETURN TRUE;
END;
$function$;

-- 6. Update user_cancel_ai_job to include bg_remover_jobs
-- First get the current definition and check it includes flyer_maker
-- We need to add bg_remover_jobs block
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
  END IF;

  RETURN QUERY SELECT TRUE, CASE WHEN v_should_refund THEN v_credit_cost ELSE 0 END, NULL::TEXT;
END;
$function$;

-- 7. Update get_ai_tools_usage_count to include bg_remover_jobs
DROP FUNCTION IF EXISTS get_ai_tools_usage_count(TIMESTAMPTZ, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION public.get_ai_tools_usage_count(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE total_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM (
    SELECT id FROM upscaler_jobs WHERE user_id IS NOT NULL AND (p_start_date IS NULL OR created_at >= p_start_date) AND (p_end_date IS NULL OR created_at <= p_end_date)
    UNION ALL
    SELECT id FROM pose_changer_jobs WHERE user_id IS NOT NULL AND (p_start_date IS NULL OR created_at >= p_start_date) AND (p_end_date IS NULL OR created_at <= p_end_date)
    UNION ALL
    SELECT id FROM veste_ai_jobs WHERE user_id IS NOT NULL AND (p_start_date IS NULL OR created_at >= p_start_date) AND (p_end_date IS NULL OR created_at <= p_end_date)
    UNION ALL
    SELECT id FROM video_upscaler_jobs WHERE user_id IS NOT NULL AND (p_start_date IS NULL OR created_at >= p_start_date) AND (p_end_date IS NULL OR created_at <= p_end_date)
    UNION ALL
    SELECT id FROM arcano_cloner_jobs WHERE user_id IS NOT NULL AND (p_start_date IS NULL OR created_at >= p_start_date) AND (p_end_date IS NULL OR created_at <= p_end_date)
    UNION ALL
    SELECT id FROM character_generator_jobs WHERE user_id IS NOT NULL AND (p_start_date IS NULL OR created_at >= p_start_date) AND (p_end_date IS NULL OR created_at <= p_end_date)
    UNION ALL
    SELECT id FROM flyer_maker_jobs WHERE user_id IS NOT NULL AND (p_start_date IS NULL OR created_at >= p_start_date) AND (p_end_date IS NULL OR created_at <= p_end_date)
    UNION ALL
    SELECT id FROM bg_remover_jobs WHERE user_id IS NOT NULL AND (p_start_date IS NULL OR created_at >= p_start_date) AND (p_end_date IS NULL OR created_at <= p_end_date)
  ) AS all_jobs;
  RETURN total_count;
END;
$$;

-- 8. Update get_ai_tools_usage_summary to include bg_remover_jobs
DROP FUNCTION IF EXISTS get_ai_tools_usage_summary(TIMESTAMPTZ, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION public.get_ai_tools_usage_summary(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
) RETURNS TABLE(total_jobs BIGINT, completed_jobs BIGINT, failed_jobs BIGINT, total_rh_cost NUMERIC, total_user_credits NUMERIC, total_profit NUMERIC, jobs_with_queue BIGINT, avg_queue_wait_seconds NUMERIC, avg_processing_seconds NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH all_jobs AS (
    SELECT uj.status, COALESCE(uj.rh_cost, 0) as rh_cost, COALESCE(uj.user_credit_cost, 0) as user_credit_cost,
      COALESCE(uj.waited_in_queue, false) as waited_in_queue, COALESCE(uj.queue_wait_seconds, 0) as queue_wait_seconds,
      CASE WHEN uj.started_at IS NOT NULL AND uj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (uj.completed_at - uj.started_at))::INTEGER ELSE 0 END as processing_seconds
    FROM upscaler_jobs uj WHERE uj.user_id IS NOT NULL AND (p_start_date IS NULL OR uj.created_at >= p_start_date) AND (p_end_date IS NULL OR uj.created_at <= p_end_date)
    UNION ALL
    SELECT pcj.status, COALESCE(pcj.rh_cost, 0), COALESCE(pcj.user_credit_cost, 0), COALESCE(pcj.waited_in_queue, false), COALESCE(pcj.queue_wait_seconds, 0),
      CASE WHEN pcj.started_at IS NOT NULL AND pcj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (pcj.completed_at - pcj.started_at))::INTEGER ELSE 0 END
    FROM pose_changer_jobs pcj WHERE pcj.user_id IS NOT NULL AND (p_start_date IS NULL OR pcj.created_at >= p_start_date) AND (p_end_date IS NULL OR pcj.created_at <= p_end_date)
    UNION ALL
    SELECT vaj.status, COALESCE(vaj.rh_cost, 0), COALESCE(vaj.user_credit_cost, 0), COALESCE(vaj.waited_in_queue, false), COALESCE(vaj.queue_wait_seconds, 0),
      CASE WHEN vaj.started_at IS NOT NULL AND vaj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (vaj.completed_at - vaj.started_at))::INTEGER ELSE 0 END
    FROM veste_ai_jobs vaj WHERE vaj.user_id IS NOT NULL AND (p_start_date IS NULL OR vaj.created_at >= p_start_date) AND (p_end_date IS NULL OR vaj.created_at <= p_end_date)
    UNION ALL
    SELECT vuj.status, COALESCE(vuj.rh_cost, 0), COALESCE(vuj.user_credit_cost, 0), COALESCE(vuj.waited_in_queue, false), COALESCE(vuj.queue_wait_seconds, 0),
      CASE WHEN vuj.started_at IS NOT NULL AND vuj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (vuj.completed_at - vuj.started_at))::INTEGER ELSE 0 END
    FROM video_upscaler_jobs vuj WHERE vuj.user_id IS NOT NULL AND (p_start_date IS NULL OR vuj.created_at >= p_start_date) AND (p_end_date IS NULL OR vuj.created_at <= p_end_date)
    UNION ALL
    SELECT acj.status, COALESCE(acj.rh_cost, 0), COALESCE(acj.user_credit_cost, 0), COALESCE(acj.waited_in_queue, false), COALESCE(acj.queue_wait_seconds, 0),
      CASE WHEN acj.started_at IS NOT NULL AND acj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (acj.completed_at - acj.started_at))::INTEGER ELSE 0 END
    FROM arcano_cloner_jobs acj WHERE acj.user_id IS NOT NULL AND (p_start_date IS NULL OR acj.created_at >= p_start_date) AND (p_end_date IS NULL OR acj.created_at <= p_end_date)
    UNION ALL
    SELECT cgj.status, COALESCE(cgj.rh_cost, 0), COALESCE(cgj.user_credit_cost, 0), COALESCE(cgj.waited_in_queue, false), COALESCE(cgj.queue_wait_seconds, 0),
      CASE WHEN cgj.started_at IS NOT NULL AND cgj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (cgj.completed_at - cgj.started_at))::INTEGER ELSE 0 END
    FROM character_generator_jobs cgj WHERE cgj.user_id IS NOT NULL AND (p_start_date IS NULL OR cgj.created_at >= p_start_date) AND (p_end_date IS NULL OR cgj.created_at <= p_end_date)
    UNION ALL
    SELECT fmj.status, COALESCE(fmj.rh_cost, 0), COALESCE(fmj.user_credit_cost, 0), COALESCE(fmj.waited_in_queue, false), COALESCE(fmj.queue_wait_seconds, 0),
      CASE WHEN fmj.started_at IS NOT NULL AND fmj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (fmj.completed_at - fmj.started_at))::INTEGER ELSE 0 END
    FROM flyer_maker_jobs fmj WHERE fmj.user_id IS NOT NULL AND (p_start_date IS NULL OR fmj.created_at >= p_start_date) AND (p_end_date IS NULL OR fmj.created_at <= p_end_date)
    UNION ALL
    SELECT brj.status, COALESCE(brj.rh_cost, 0), COALESCE(brj.user_credit_cost, 0), COALESCE(brj.waited_in_queue, false), COALESCE(brj.queue_wait_seconds, 0),
      CASE WHEN brj.started_at IS NOT NULL AND brj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (brj.completed_at - brj.started_at))::INTEGER ELSE 0 END
    FROM bg_remover_jobs brj WHERE brj.user_id IS NOT NULL AND (p_start_date IS NULL OR brj.created_at >= p_start_date) AND (p_end_date IS NULL OR brj.created_at <= p_end_date)
  )
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT,
    COALESCE(SUM(rh_cost), 0)::NUMERIC,
    COALESCE(SUM(user_credit_cost), 0)::NUMERIC,
    COALESCE(SUM(user_credit_cost) - SUM(rh_cost), 0)::NUMERIC,
    COUNT(*) FILTER (WHERE waited_in_queue = true)::BIGINT,
    COALESCE(AVG(queue_wait_seconds) FILTER (WHERE waited_in_queue = true), 0)::NUMERIC,
    COALESCE(AVG(processing_seconds) FILTER (WHERE processing_seconds > 0), 0)::NUMERIC
  FROM all_jobs;
END;
$$;

-- 9. Update get_ai_tools_usage (main listing with pagination) to include bg_remover_jobs
DROP FUNCTION IF EXISTS get_ai_tools_usage(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.get_ai_tools_usage(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20
) RETURNS TABLE(
  id UUID, tool_name TEXT, user_id UUID, user_email TEXT, user_name TEXT,
  status TEXT, error_message TEXT, rh_cost NUMERIC, user_credit_cost NUMERIC, profit NUMERIC,
  waited_in_queue BOOLEAN, queue_wait_seconds INTEGER, processing_seconds INTEGER,
  created_at TIMESTAMPTZ, started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_offset INTEGER;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  v_offset := (p_page - 1) * p_page_size;
  RETURN QUERY
  WITH all_jobs AS (
    SELECT uj.id, 'Upscaler Arcano'::TEXT as tool_name, uj.user_id, uj.status, uj.error_message,
      COALESCE(uj.rh_cost, 0)::NUMERIC as rh_cost, COALESCE(uj.user_credit_cost, 0)::NUMERIC as user_credit_cost,
      (COALESCE(uj.user_credit_cost, 0) - COALESCE(uj.rh_cost, 0))::NUMERIC as profit,
      COALESCE(uj.waited_in_queue, false) as waited_in_queue, COALESCE(uj.queue_wait_seconds, 0) as queue_wait_seconds,
      CASE WHEN uj.started_at IS NOT NULL AND uj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (uj.completed_at - uj.started_at))::INTEGER ELSE 0 END as processing_seconds,
      uj.created_at, uj.started_at, uj.completed_at
    FROM upscaler_jobs uj
    WHERE uj.user_id IS NOT NULL AND (p_start_date IS NULL OR uj.created_at >= p_start_date) AND (p_end_date IS NULL OR uj.created_at <= p_end_date)
    UNION ALL
    SELECT pcj.id, 'Pose Changer'::TEXT, pcj.user_id, pcj.status, pcj.error_message,
      COALESCE(pcj.rh_cost, 0)::NUMERIC, COALESCE(pcj.user_credit_cost, 0)::NUMERIC,
      (COALESCE(pcj.user_credit_cost, 0) - COALESCE(pcj.rh_cost, 0))::NUMERIC,
      COALESCE(pcj.waited_in_queue, false), COALESCE(pcj.queue_wait_seconds, 0),
      CASE WHEN pcj.started_at IS NOT NULL AND pcj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (pcj.completed_at - pcj.started_at))::INTEGER ELSE 0 END,
      pcj.created_at, pcj.started_at, pcj.completed_at
    FROM pose_changer_jobs pcj
    WHERE pcj.user_id IS NOT NULL AND (p_start_date IS NULL OR pcj.created_at >= p_start_date) AND (p_end_date IS NULL OR pcj.created_at <= p_end_date)
    UNION ALL
    SELECT vaj.id, 'Veste AI'::TEXT, vaj.user_id, vaj.status, vaj.error_message,
      COALESCE(vaj.rh_cost, 0)::NUMERIC, COALESCE(vaj.user_credit_cost, 0)::NUMERIC,
      (COALESCE(vaj.user_credit_cost, 0) - COALESCE(vaj.rh_cost, 0))::NUMERIC,
      COALESCE(vaj.waited_in_queue, false), COALESCE(vaj.queue_wait_seconds, 0),
      CASE WHEN vaj.started_at IS NOT NULL AND vaj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (vaj.completed_at - vaj.started_at))::INTEGER ELSE 0 END,
      vaj.created_at, vaj.started_at, vaj.completed_at
    FROM veste_ai_jobs vaj
    WHERE vaj.user_id IS NOT NULL AND (p_start_date IS NULL OR vaj.created_at >= p_start_date) AND (p_end_date IS NULL OR vaj.created_at <= p_end_date)
    UNION ALL
    SELECT vuj.id, 'Video Upscaler'::TEXT, vuj.user_id, vuj.status, vuj.error_message,
      COALESCE(vuj.rh_cost, 0)::NUMERIC, COALESCE(vuj.user_credit_cost, 0)::NUMERIC,
      (COALESCE(vuj.user_credit_cost, 0) - COALESCE(vuj.rh_cost, 0))::NUMERIC,
      COALESCE(vuj.waited_in_queue, false), COALESCE(vuj.queue_wait_seconds, 0),
      CASE WHEN vuj.started_at IS NOT NULL AND vuj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (vuj.completed_at - vuj.started_at))::INTEGER ELSE 0 END,
      vuj.created_at, vuj.started_at, vuj.completed_at
    FROM video_upscaler_jobs vuj
    WHERE vuj.user_id IS NOT NULL AND (p_start_date IS NULL OR vuj.created_at >= p_start_date) AND (p_end_date IS NULL OR vuj.created_at <= p_end_date)
    UNION ALL
    SELECT acj.id, 'Arcano Cloner'::TEXT, acj.user_id, acj.status, acj.error_message,
      COALESCE(acj.rh_cost, 0)::NUMERIC, COALESCE(acj.user_credit_cost, 0)::NUMERIC,
      (COALESCE(acj.user_credit_cost, 0) - COALESCE(acj.rh_cost, 0))::NUMERIC,
      COALESCE(acj.waited_in_queue, false), COALESCE(acj.queue_wait_seconds, 0),
      CASE WHEN acj.started_at IS NOT NULL AND acj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (acj.completed_at - acj.started_at))::INTEGER ELSE 0 END,
      acj.created_at, acj.started_at, acj.completed_at
    FROM arcano_cloner_jobs acj
    WHERE acj.user_id IS NOT NULL AND (p_start_date IS NULL OR acj.created_at >= p_start_date) AND (p_end_date IS NULL OR acj.created_at <= p_end_date)
    UNION ALL
    SELECT cgj.id, 'Gerador Avatar'::TEXT, cgj.user_id, cgj.status, cgj.error_message,
      COALESCE(cgj.rh_cost, 0)::NUMERIC, COALESCE(cgj.user_credit_cost, 0)::NUMERIC,
      (COALESCE(cgj.user_credit_cost, 0) - COALESCE(cgj.rh_cost, 0))::NUMERIC,
      COALESCE(cgj.waited_in_queue, false), COALESCE(cgj.queue_wait_seconds, 0),
      CASE WHEN cgj.started_at IS NOT NULL AND cgj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (cgj.completed_at - cgj.started_at))::INTEGER ELSE 0 END,
      cgj.created_at, cgj.started_at, cgj.completed_at
    FROM character_generator_jobs cgj
    WHERE cgj.user_id IS NOT NULL AND (p_start_date IS NULL OR cgj.created_at >= p_start_date) AND (p_end_date IS NULL OR cgj.created_at <= p_end_date)
    UNION ALL
    SELECT fmj.id, 'Flyer Maker'::TEXT, fmj.user_id, fmj.status, fmj.error_message,
      COALESCE(fmj.rh_cost, 0)::NUMERIC, COALESCE(fmj.user_credit_cost, 0)::NUMERIC,
      (COALESCE(fmj.user_credit_cost, 0) - COALESCE(fmj.rh_cost, 0))::NUMERIC,
      COALESCE(fmj.waited_in_queue, false), COALESCE(fmj.queue_wait_seconds, 0),
      CASE WHEN fmj.started_at IS NOT NULL AND fmj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (fmj.completed_at - fmj.started_at))::INTEGER ELSE 0 END,
      fmj.created_at, fmj.started_at, fmj.completed_at
    FROM flyer_maker_jobs fmj
    WHERE fmj.user_id IS NOT NULL AND (p_start_date IS NULL OR fmj.created_at >= p_start_date) AND (p_end_date IS NULL OR fmj.created_at <= p_end_date)
    UNION ALL
    SELECT brj.id, 'Remover Fundo'::TEXT, brj.user_id, brj.status, brj.error_message,
      COALESCE(brj.rh_cost, 0)::NUMERIC, COALESCE(brj.user_credit_cost, 0)::NUMERIC,
      (COALESCE(brj.user_credit_cost, 0) - COALESCE(brj.rh_cost, 0))::NUMERIC,
      COALESCE(brj.waited_in_queue, false), COALESCE(brj.queue_wait_seconds, 0),
      CASE WHEN brj.started_at IS NOT NULL AND brj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (brj.completed_at - brj.started_at))::INTEGER ELSE 0 END,
      brj.created_at, brj.started_at, brj.completed_at
    FROM bg_remover_jobs brj
    WHERE brj.user_id IS NOT NULL AND (p_start_date IS NULL OR brj.created_at >= p_start_date) AND (p_end_date IS NULL OR brj.created_at <= p_end_date)
  )
  SELECT aj.id, aj.tool_name, aj.user_id,
    COALESCE(p.email, 'N/A')::TEXT as user_email,
    COALESCE(p.name, 'N/A')::TEXT as user_name,
    aj.status, aj.error_message,
    aj.rh_cost, aj.user_credit_cost, aj.profit,
    aj.waited_in_queue, aj.queue_wait_seconds, aj.processing_seconds,
    aj.created_at, aj.started_at, aj.completed_at
  FROM all_jobs aj
  LEFT JOIN profiles p ON p.id = aj.user_id
  ORDER BY aj.created_at DESC
  LIMIT p_page_size OFFSET v_offset;
END;
$$;

-- 10. Update get_ai_tools_cost_averages to include bg_remover_jobs
DROP FUNCTION IF EXISTS get_ai_tools_cost_averages();
CREATE OR REPLACE FUNCTION public.get_ai_tools_cost_averages()
RETURNS TABLE(tool_name TEXT, total_completed BIGINT, avg_rh_cost NUMERIC, avg_user_credits NUMERIC, total_rh_cost NUMERIC, total_user_credits NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 'Upscaler Arcano'::TEXT, COUNT(*)::BIGINT, COALESCE(ROUND(AVG(uj.rh_cost)::NUMERIC, 2), 0), COALESCE(ROUND(AVG(uj.user_credit_cost)::NUMERIC, 2), 0), COALESCE(SUM(uj.rh_cost)::NUMERIC, 0), COALESCE(SUM(uj.user_credit_cost)::NUMERIC, 0)
  FROM upscaler_jobs uj WHERE uj.status = 'completed'
  UNION ALL
  SELECT 'Pose Changer'::TEXT, COUNT(*)::BIGINT, COALESCE(ROUND(AVG(pcj.rh_cost)::NUMERIC, 2), 0), COALESCE(ROUND(AVG(pcj.user_credit_cost)::NUMERIC, 2), 0), COALESCE(SUM(pcj.rh_cost)::NUMERIC, 0), COALESCE(SUM(pcj.user_credit_cost)::NUMERIC, 0)
  FROM pose_changer_jobs pcj WHERE pcj.status = 'completed'
  UNION ALL
  SELECT 'Veste AI'::TEXT, COUNT(*)::BIGINT, COALESCE(ROUND(AVG(vaj.rh_cost)::NUMERIC, 2), 0), COALESCE(ROUND(AVG(vaj.user_credit_cost)::NUMERIC, 2), 0), COALESCE(SUM(vaj.rh_cost)::NUMERIC, 0), COALESCE(SUM(vaj.user_credit_cost)::NUMERIC, 0)
  FROM veste_ai_jobs vaj WHERE vaj.status = 'completed'
  UNION ALL
  SELECT 'Video Upscaler'::TEXT, COUNT(*)::BIGINT, COALESCE(ROUND(AVG(vuj.rh_cost)::NUMERIC, 2), 0), COALESCE(ROUND(AVG(vuj.user_credit_cost)::NUMERIC, 2), 0), COALESCE(SUM(vuj.rh_cost)::NUMERIC, 0), COALESCE(SUM(vuj.user_credit_cost)::NUMERIC, 0)
  FROM video_upscaler_jobs vuj WHERE vuj.status = 'completed'
  UNION ALL
  SELECT 'Arcano Cloner'::TEXT, COUNT(*)::BIGINT, COALESCE(ROUND(AVG(acj.rh_cost)::NUMERIC, 2), 0), COALESCE(ROUND(AVG(acj.user_credit_cost)::NUMERIC, 2), 0), COALESCE(SUM(acj.rh_cost)::NUMERIC, 0), COALESCE(SUM(acj.user_credit_cost)::NUMERIC, 0)
  FROM arcano_cloner_jobs acj WHERE acj.status = 'completed'
  UNION ALL
  SELECT 'Gerador Avatar'::TEXT, COUNT(*)::BIGINT, COALESCE(ROUND(AVG(cgj.rh_cost)::NUMERIC, 2), 0), COALESCE(ROUND(AVG(cgj.user_credit_cost)::NUMERIC, 2), 0), COALESCE(SUM(cgj.rh_cost)::NUMERIC, 0), COALESCE(SUM(cgj.user_credit_cost)::NUMERIC, 0)
  FROM character_generator_jobs cgj WHERE cgj.status = 'completed'
  UNION ALL
  SELECT 'Gerar Imagem'::TEXT, COUNT(*)::BIGINT, 0::NUMERIC, COALESCE(ROUND(AVG(ig.user_credit_cost)::NUMERIC, 2), 0), 0::NUMERIC, COALESCE(SUM(ig.user_credit_cost)::NUMERIC, 0)
  FROM image_generator_jobs ig WHERE ig.status = 'completed'
  UNION ALL
  SELECT 'Gerar Vídeo'::TEXT, COUNT(*)::BIGINT, 0::NUMERIC, COALESCE(ROUND(AVG(vg.user_credit_cost)::NUMERIC, 2), 0), 0::NUMERIC, COALESCE(SUM(vg.user_credit_cost)::NUMERIC, 0)
  FROM video_generator_jobs vg WHERE vg.status = 'completed'
  UNION ALL
  SELECT 'Flyer Maker'::TEXT, COUNT(*)::BIGINT, COALESCE(ROUND(AVG(fmj.rh_cost)::NUMERIC, 2), 0), COALESCE(ROUND(AVG(fmj.user_credit_cost)::NUMERIC, 2), 0), COALESCE(SUM(fmj.rh_cost)::NUMERIC, 0), COALESCE(SUM(fmj.user_credit_cost)::NUMERIC, 0)
  FROM flyer_maker_jobs fmj WHERE fmj.status = 'completed'
  UNION ALL
  SELECT 'Remover Fundo'::TEXT, COUNT(*)::BIGINT, COALESCE(ROUND(AVG(brj.rh_cost)::NUMERIC, 2), 0), COALESCE(ROUND(AVG(brj.user_credit_cost)::NUMERIC, 2), 0), COALESCE(SUM(brj.rh_cost)::NUMERIC, 0), COALESCE(SUM(brj.user_credit_cost)::NUMERIC, 0)
  FROM bg_remover_jobs brj WHERE brj.status = 'completed';
END;
$$;
