
-- 1. Recreate get_ai_tools_usage with character_generator_jobs
CREATE OR REPLACE FUNCTION public.get_ai_tools_usage(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  tool_name TEXT,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  status TEXT,
  error_message TEXT,
  rh_cost NUMERIC,
  user_credit_cost NUMERIC,
  profit NUMERIC,
  waited_in_queue BOOLEAN,
  queue_wait_seconds INTEGER,
  processing_seconds INTEGER,
  created_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INTEGER;
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
    
    -- Character Generator (Gerador Avatar)
    SELECT cgj.id, 'Gerador Avatar'::TEXT, cgj.user_id, cgj.status, cgj.error_message,
      COALESCE(cgj.rh_cost, 0)::NUMERIC, COALESCE(cgj.user_credit_cost, 0)::NUMERIC,
      (COALESCE(cgj.user_credit_cost, 0) - COALESCE(cgj.rh_cost, 0))::NUMERIC,
      COALESCE(cgj.waited_in_queue, false), COALESCE(cgj.queue_wait_seconds, 0),
      CASE WHEN cgj.started_at IS NOT NULL AND cgj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (cgj.completed_at - cgj.started_at))::INTEGER ELSE 0 END,
      cgj.created_at, cgj.started_at, cgj.completed_at
    FROM character_generator_jobs cgj
    WHERE cgj.user_id IS NOT NULL AND (p_start_date IS NULL OR cgj.created_at >= p_start_date) AND (p_end_date IS NULL OR cgj.created_at <= p_end_date)
  )
  SELECT aj.id, aj.tool_name, aj.user_id,
    COALESCE(p.email, '')::TEXT as user_email,
    COALESCE(p.name, '')::TEXT as user_name,
    aj.status, aj.error_message, aj.rh_cost, aj.user_credit_cost, aj.profit,
    aj.waited_in_queue, aj.queue_wait_seconds, aj.processing_seconds,
    aj.created_at, aj.started_at, aj.completed_at
  FROM all_jobs aj
  LEFT JOIN profiles p ON p.id = aj.user_id
  ORDER BY aj.created_at DESC
  LIMIT p_page_size OFFSET v_offset;
END;
$$;

-- 2. Recreate get_ai_tools_usage_count with character_generator_jobs
CREATE OR REPLACE FUNCTION public.get_ai_tools_usage_count(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM (
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
  ) AS all_jobs;
  
  RETURN total_count;
END;
$$;

-- 3. Recreate get_ai_tools_usage_summary with character_generator_jobs
CREATE OR REPLACE FUNCTION public.get_ai_tools_usage_summary(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
  total_jobs BIGINT,
  completed_jobs BIGINT,
  failed_jobs BIGINT,
  total_rh_cost NUMERIC,
  total_user_credits NUMERIC,
  total_profit NUMERIC,
  jobs_with_queue BIGINT,
  avg_queue_wait_seconds NUMERIC,
  avg_processing_seconds NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  )
  SELECT
    COUNT(*)::BIGINT as total_jobs,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_jobs,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_jobs,
    COALESCE(SUM(rh_cost), 0)::NUMERIC as total_rh_cost,
    COALESCE(SUM(user_credit_cost), 0)::NUMERIC as total_user_credits,
    COALESCE(SUM(user_credit_cost) - SUM(rh_cost), 0)::NUMERIC as total_profit,
    COUNT(*) FILTER (WHERE waited_in_queue = true)::BIGINT as jobs_with_queue,
    COALESCE(AVG(queue_wait_seconds) FILTER (WHERE waited_in_queue = true), 0)::NUMERIC as avg_queue_wait_seconds,
    COALESCE(AVG(processing_seconds) FILTER (WHERE processing_seconds > 0), 0)::NUMERIC as avg_processing_seconds
  FROM all_jobs;
END;
$$;

-- 4. Recreate get_ai_tools_cost_averages with character_generator_jobs
CREATE OR REPLACE FUNCTION public.get_ai_tools_cost_averages()
RETURNS TABLE(
  tool_name TEXT,
  total_jobs BIGINT,
  avg_rh_cost NUMERIC,
  avg_credit_cost NUMERIC,
  total_rh_cost NUMERIC,
  total_credit_cost NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  FROM character_generator_jobs cgj WHERE cgj.status = 'completed';
END;
$$;
