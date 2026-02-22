
-- ==========================================
-- FLYER MAKER - TABLE + RLS + REALTIME
-- ==========================================

CREATE TABLE public.flyer_maker_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- Flyer reference
  reference_image_url TEXT,
  reference_file_name TEXT,
  
  -- Artist photos (1-5)
  artist_photo_urls JSONB DEFAULT '[]'::jsonb,
  artist_photo_file_names JSONB DEFAULT '[]'::jsonb,
  artist_count INTEGER DEFAULT 1,
  
  -- Logo
  logo_url TEXT,
  logo_file_name TEXT,
  
  -- Text inputs
  date_time_location TEXT,
  title TEXT,
  address TEXT,
  artist_names TEXT,
  footer_promo TEXT,
  
  -- Settings
  image_size TEXT DEFAULT '3:4',
  creativity INTEGER DEFAULT 0,
  
  -- Processing fields (same as other tools)
  task_id TEXT,
  output_url TEXT,
  thumbnail_url TEXT,
  error_message TEXT,
  position INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Credits
  user_credit_cost INTEGER,
  rh_cost NUMERIC,
  credits_charged BOOLEAN DEFAULT false,
  credits_refunded BOOLEAN DEFAULT false,
  
  -- Queue
  waited_in_queue BOOLEAN DEFAULT false,
  queue_wait_seconds INTEGER,
  api_account TEXT NOT NULL DEFAULT 'primary',
  
  -- Observability
  current_step TEXT,
  failed_at_step TEXT,
  step_history JSONB DEFAULT '[]'::jsonb,
  raw_api_response JSONB,
  raw_webhook_payload JSONB,
  job_payload JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_flyer_maker_jobs_user_id ON public.flyer_maker_jobs(user_id);
CREATE INDEX idx_flyer_maker_jobs_status ON public.flyer_maker_jobs(status);
CREATE INDEX idx_flyer_maker_jobs_task_id ON public.flyer_maker_jobs(task_id);
CREATE INDEX idx_flyer_maker_jobs_session_id ON public.flyer_maker_jobs(session_id);

-- RLS
ALTER TABLE public.flyer_maker_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own flyer maker jobs"
  ON public.flyer_maker_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own flyer maker jobs"
  ON public.flyer_maker_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.flyer_maker_jobs;

-- Updated_at trigger
CREATE TRIGGER update_flyer_maker_jobs_updated_at
  BEFORE UPDATE ON public.flyer_maker_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- UPDATE RPCs TO INCLUDE flyer_maker_jobs
-- ==========================================

-- 1. cleanup_all_stale_ai_jobs
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

  -- FLYER MAKER JOBS (NEW)
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

  RETURN QUERY VALUES 
    ('upscaler_jobs', upscaler_cancelled, upscaler_refunded),
    ('pose_changer_jobs', pose_cancelled, pose_refunded),
    ('veste_ai_jobs', veste_cancelled, veste_refunded),
    ('video_upscaler_jobs', video_cancelled, video_refunded),
    ('arcano_cloner_jobs', arcano_cancelled, arcano_refunded),
    ('character_generator_jobs', chargen_cancelled, chargen_refunded),
    ('flyer_maker_jobs', flyer_cancelled, flyer_refunded);
END;
$function$;

-- 2. user_cancel_ai_job - add flyer_maker_jobs
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
  ELSE
    RETURN QUERY SELECT FALSE, 0, 'Tabela inválida'::TEXT; RETURN;
  END IF;

  IF v_user_id IS NULL THEN RETURN QUERY SELECT FALSE, 0, 'Job não encontrado'::TEXT; RETURN; END IF;
  IF v_user_id != v_auth_user_id THEN RETURN QUERY SELECT FALSE, 0, 'Você não tem permissão para cancelar este trabalho'::TEXT; RETURN; END IF;
  IF v_current_status NOT IN ('running', 'queued', 'starting') THEN RETURN QUERY SELECT FALSE, 0, 'Este trabalho já foi finalizado'::TEXT; RETURN; END IF;

  v_should_refund := v_current_status = 'queued' AND v_credits_charged = true AND v_credits_refunded = false AND v_credit_cost > 0;
  
  IF v_should_refund THEN
    PERFORM refund_upscaler_credits(v_user_id, v_credit_cost, 'Estorno: trabalho cancelado pelo usuário (ainda na fila)');
  ELSE
    v_credit_cost := 0;
  END IF;

  IF p_table_name = 'upscaler_jobs' THEN
    UPDATE upscaler_jobs SET status = 'cancelled', error_message = CASE WHEN v_should_refund THEN 'Cancelado pelo usuário. Créditos estornados.' ELSE 'Cancelado pelo usuário. Créditos não devolvidos (processamento já iniciado).' END, completed_at = NOW(), credits_refunded = v_should_refund WHERE id = p_job_id;
  ELSIF p_table_name = 'pose_changer_jobs' THEN
    UPDATE pose_changer_jobs SET status = 'cancelled', error_message = CASE WHEN v_should_refund THEN 'Cancelado pelo usuário. Créditos estornados.' ELSE 'Cancelado pelo usuário. Créditos não devolvidos (processamento já iniciado).' END, completed_at = NOW(), credits_refunded = v_should_refund WHERE id = p_job_id;
  ELSIF p_table_name = 'veste_ai_jobs' THEN
    UPDATE veste_ai_jobs SET status = 'cancelled', error_message = CASE WHEN v_should_refund THEN 'Cancelado pelo usuário. Créditos estornados.' ELSE 'Cancelado pelo usuário. Créditos não devolvidos (processamento já iniciado).' END, completed_at = NOW(), credits_refunded = v_should_refund WHERE id = p_job_id;
  ELSIF p_table_name = 'video_upscaler_jobs' THEN
    UPDATE video_upscaler_jobs SET status = 'cancelled', error_message = CASE WHEN v_should_refund THEN 'Cancelado pelo usuário. Créditos estornados.' ELSE 'Cancelado pelo usuário. Créditos não devolvidos (processamento já iniciado).' END, completed_at = NOW(), credits_refunded = v_should_refund WHERE id = p_job_id;
  ELSIF p_table_name = 'character_generator_jobs' THEN
    UPDATE character_generator_jobs SET status = 'cancelled', error_message = CASE WHEN v_should_refund THEN 'Cancelado pelo usuário. Créditos estornados.' ELSE 'Cancelado pelo usuário. Créditos não devolvidos (processamento já iniciado).' END, completed_at = NOW(), credits_refunded = v_should_refund WHERE id = p_job_id;
  ELSIF p_table_name = 'flyer_maker_jobs' THEN
    UPDATE flyer_maker_jobs SET status = 'cancelled', error_message = CASE WHEN v_should_refund THEN 'Cancelado pelo usuário. Créditos estornados.' ELSE 'Cancelado pelo usuário. Créditos não devolvidos (processamento já iniciado).' END, completed_at = NOW(), credits_refunded = v_should_refund WHERE id = p_job_id;
  END IF;

  RETURN QUERY SELECT TRUE, v_credit_cost, NULL::TEXT;
END;
$function$;

-- 3. mark_pending_job_as_failed - add flyer_maker_jobs
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
  END IF;

  RETURN TRUE;
END;
$function$;

-- 4. get_ai_tools_cost_averages - add Flyer Maker
CREATE OR REPLACE FUNCTION public.get_ai_tools_cost_averages()
 RETURNS TABLE(tool_name text, total_completed bigint, avg_rh_cost numeric, avg_user_credit numeric, total_rh_cost numeric, total_user_credits numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  FROM flyer_maker_jobs fmj WHERE fmj.status = 'completed';
END;
$function$;
