
-- =============================================
-- CHARACTER GENERATOR JOBS TABLE
-- =============================================
CREATE TABLE public.character_generator_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID,
  task_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- 4 input images
  front_image_url TEXT,
  profile_image_url TEXT,
  semi_profile_image_url TEXT,
  low_angle_image_url TEXT,
  
  -- RunningHub file names after upload
  front_file_name TEXT,
  profile_file_name TEXT,
  semi_profile_file_name TEXT,
  low_angle_file_name TEXT,
  
  -- Output
  output_url TEXT,
  thumbnail_url TEXT,
  error_message TEXT,
  
  -- Queue & processing
  position INTEGER,
  api_account TEXT NOT NULL DEFAULT 'primary',
  waited_in_queue BOOLEAN DEFAULT false,
  queue_wait_seconds INTEGER,
  
  -- Credits
  user_credit_cost INTEGER,
  credits_charged BOOLEAN DEFAULT false,
  credits_refunded BOOLEAN DEFAULT false,
  
  -- Observability
  current_step TEXT,
  failed_at_step TEXT,
  step_history JSONB,
  job_payload JSONB,
  raw_api_response JSONB,
  raw_webhook_payload JSONB,
  rh_cost INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_character_generator_jobs_user_id ON public.character_generator_jobs(user_id);
CREATE INDEX idx_character_generator_jobs_status ON public.character_generator_jobs(status);
CREATE INDEX idx_character_generator_jobs_session_id ON public.character_generator_jobs(session_id);
CREATE INDEX idx_character_generator_jobs_task_id ON public.character_generator_jobs(task_id);

-- Enable RLS
ALTER TABLE public.character_generator_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own character generator jobs"
  ON public.character_generator_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own character generator jobs"
  ON public.character_generator_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role has full access to character generator jobs"
  ON public.character_generator_jobs FOR ALL
  USING (auth.role() = 'service_role');

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.character_generator_jobs;

-- =============================================
-- SAVED CHARACTERS TABLE
-- =============================================
CREATE TABLE public.saved_characters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  job_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_saved_characters_user_id ON public.saved_characters(user_id);

ALTER TABLE public.saved_characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved characters"
  ON public.saved_characters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved characters"
  ON public.saved_characters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved characters"
  ON public.saved_characters FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- UPDATE RPCs
-- =============================================

-- Update cleanup_all_stale_ai_jobs to include character_generator_jobs
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

  -- CHARACTER GENERATOR JOBS (NEW)
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

  RETURN QUERY VALUES 
    ('upscaler_jobs', upscaler_cancelled, upscaler_refunded),
    ('pose_changer_jobs', pose_cancelled, pose_refunded),
    ('veste_ai_jobs', veste_cancelled, veste_refunded),
    ('video_upscaler_jobs', video_cancelled, video_refunded),
    ('arcano_cloner_jobs', arcano_cancelled, arcano_refunded),
    ('character_generator_jobs', chargen_cancelled, chargen_refunded);
END;
$function$;

-- Update get_user_ai_creations to include character_generator_jobs
CREATE OR REPLACE FUNCTION public.get_user_ai_creations(p_media_type text DEFAULT 'all'::text, p_offset integer DEFAULT 0, p_limit integer DEFAULT 24)
 RETURNS TABLE(id uuid, output_url text, thumbnail_url text, tool_name text, media_type text, created_at timestamp with time zone, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH all_creations AS (
    SELECT uj.id, uj.output_url, uj.thumbnail_url, 'Upscaler Arcano'::TEXT as tool_name, 'image'::TEXT as media_type, uj.created_at, (uj.completed_at + interval '5 days') as expires_at
    FROM upscaler_jobs uj WHERE uj.user_id = auth.uid() AND uj.status = 'completed' AND uj.output_url IS NOT NULL AND (uj.completed_at + interval '5 days') > now()
    
    UNION ALL
    
    SELECT pcj.id, pcj.output_url, pcj.thumbnail_url, 'Pose Changer'::TEXT, 'image'::TEXT, pcj.created_at, (pcj.completed_at + interval '5 days')
    FROM pose_changer_jobs pcj WHERE pcj.user_id = auth.uid() AND pcj.status = 'completed' AND pcj.output_url IS NOT NULL AND (pcj.completed_at + interval '5 days') > now()
    
    UNION ALL
    
    SELECT vaj.id, vaj.output_url, vaj.thumbnail_url, 'Veste AI'::TEXT, 'image'::TEXT, vaj.created_at, (vaj.completed_at + interval '5 days')
    FROM veste_ai_jobs vaj WHERE vaj.user_id = auth.uid() AND vaj.status = 'completed' AND vaj.output_url IS NOT NULL AND (vaj.completed_at + interval '5 days') > now()
    
    UNION ALL
    
    SELECT vuj.id, vuj.output_url, vuj.thumbnail_url, 'Video Upscaler'::TEXT, 'video'::TEXT, vuj.created_at, (vuj.completed_at + interval '5 days')
    FROM video_upscaler_jobs vuj WHERE vuj.user_id = auth.uid() AND vuj.status = 'completed' AND vuj.output_url IS NOT NULL AND (vuj.completed_at + interval '5 days') > now()
    
    UNION ALL
    
    SELECT cgj.id, cgj.output_url, cgj.thumbnail_url, 'Gerador Personagem'::TEXT, 'image'::TEXT, cgj.created_at, (cgj.completed_at + interval '5 days')
    FROM character_generator_jobs cgj WHERE cgj.user_id = auth.uid() AND cgj.status = 'completed' AND cgj.output_url IS NOT NULL AND (cgj.completed_at + interval '5 days') > now()
  )
  SELECT * FROM all_creations ac
  WHERE (p_media_type = 'all' OR ac.media_type = p_media_type)
  ORDER BY ac.created_at DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$function$;

-- Update user_cancel_ai_job to include character_generator_jobs
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
  END IF;

  RETURN QUERY SELECT TRUE, v_credit_cost, NULL::TEXT;
END;
$function$;

-- Update mark_pending_job_as_failed to include character_generator_jobs
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
  END IF;

  RETURN TRUE;
END;
$function$;
