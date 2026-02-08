-- =====================================================
-- RECREATE ALL 4 RPCs TO INCLUDE arcano_cloner_jobs
-- =====================================================

-- 1. get_ai_tools_usage - Main listing with pagination
DROP FUNCTION IF EXISTS get_ai_tools_usage(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_ai_tools_usage(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20
)
RETURNS TABLE (
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
BEGIN
  RETURN QUERY
  WITH all_jobs AS (
    -- Upscaler Arcano jobs
    SELECT 
      uj.id,
      'Upscaler Arcano'::TEXT as tool_name,
      uj.user_id,
      uj.status,
      uj.error_message,
      COALESCE(uj.rh_cost, 0) as rh_cost,
      COALESCE(uj.user_credit_cost, 0) as user_credit_cost,
      COALESCE(uj.user_credit_cost, 0) - COALESCE(uj.rh_cost, 0) as profit,
      COALESCE(uj.waited_in_queue, false) as waited_in_queue,
      COALESCE(uj.queue_wait_seconds, 0) as queue_wait_seconds,
      CASE 
        WHEN uj.started_at IS NOT NULL AND uj.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (uj.completed_at - uj.started_at))::INTEGER
        ELSE 0
      END as processing_seconds,
      uj.created_at,
      uj.started_at,
      uj.completed_at
    FROM upscaler_jobs uj
    WHERE uj.user_id IS NOT NULL
    
    UNION ALL
    
    -- Pose Changer jobs
    SELECT 
      pcj.id,
      'Pose Changer'::TEXT as tool_name,
      pcj.user_id,
      pcj.status,
      pcj.error_message,
      COALESCE(pcj.rh_cost, 0) as rh_cost,
      COALESCE(pcj.user_credit_cost, 0) as user_credit_cost,
      COALESCE(pcj.user_credit_cost, 0) - COALESCE(pcj.rh_cost, 0) as profit,
      COALESCE(pcj.waited_in_queue, false) as waited_in_queue,
      COALESCE(pcj.queue_wait_seconds, 0) as queue_wait_seconds,
      CASE 
        WHEN pcj.started_at IS NOT NULL AND pcj.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (pcj.completed_at - pcj.started_at))::INTEGER
        ELSE 0
      END as processing_seconds,
      pcj.created_at,
      pcj.started_at,
      pcj.completed_at
    FROM pose_changer_jobs pcj
    WHERE pcj.user_id IS NOT NULL
    
    UNION ALL
    
    -- Veste AI jobs
    SELECT 
      vaj.id,
      'Veste AI'::TEXT as tool_name,
      vaj.user_id,
      vaj.status,
      vaj.error_message,
      COALESCE(vaj.rh_cost, 0) as rh_cost,
      COALESCE(vaj.user_credit_cost, 0) as user_credit_cost,
      COALESCE(vaj.user_credit_cost, 0) - COALESCE(vaj.rh_cost, 0) as profit,
      COALESCE(vaj.waited_in_queue, false) as waited_in_queue,
      COALESCE(vaj.queue_wait_seconds, 0) as queue_wait_seconds,
      CASE 
        WHEN vaj.started_at IS NOT NULL AND vaj.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (vaj.completed_at - vaj.started_at))::INTEGER
        ELSE 0
      END as processing_seconds,
      vaj.created_at,
      vaj.started_at,
      vaj.completed_at
    FROM veste_ai_jobs vaj
    WHERE vaj.user_id IS NOT NULL
    
    UNION ALL
    
    -- Video Upscaler jobs
    SELECT 
      vuj.id,
      'Video Upscaler'::TEXT as tool_name,
      vuj.user_id,
      vuj.status,
      vuj.error_message,
      COALESCE(vuj.rh_cost, 0) as rh_cost,
      COALESCE(vuj.user_credit_cost, 0) as user_credit_cost,
      COALESCE(vuj.user_credit_cost, 0) - COALESCE(vuj.rh_cost, 0) as profit,
      COALESCE(vuj.waited_in_queue, false) as waited_in_queue,
      COALESCE(vuj.queue_wait_seconds, 0) as queue_wait_seconds,
      CASE 
        WHEN vuj.started_at IS NOT NULL AND vuj.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (vuj.completed_at - vuj.started_at))::INTEGER
        ELSE 0
      END as processing_seconds,
      vuj.created_at,
      vuj.started_at,
      vuj.completed_at
    FROM video_upscaler_jobs vuj
    WHERE vuj.user_id IS NOT NULL
    
    UNION ALL
    
    -- Arcano Cloner jobs (NEW)
    SELECT 
      acj.id,
      'Arcano Cloner'::TEXT as tool_name,
      acj.user_id,
      acj.status,
      acj.error_message,
      COALESCE(acj.rh_cost, 0) as rh_cost,
      COALESCE(acj.user_credit_cost, 0) as user_credit_cost,
      COALESCE(acj.user_credit_cost, 0) - COALESCE(acj.rh_cost, 0) as profit,
      COALESCE(acj.waited_in_queue, false) as waited_in_queue,
      COALESCE(acj.queue_wait_seconds, 0) as queue_wait_seconds,
      CASE 
        WHEN acj.started_at IS NOT NULL AND acj.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (acj.completed_at - acj.started_at))::INTEGER
        ELSE 0
      END as processing_seconds,
      acj.created_at,
      acj.started_at,
      acj.completed_at
    FROM arcano_cloner_jobs acj
    WHERE acj.user_id IS NOT NULL
  )
  SELECT 
    aj.id,
    aj.tool_name,
    aj.user_id,
    COALESCE(p.email, '') as user_email,
    COALESCE(p.name, '') as user_name,
    aj.status,
    aj.error_message,
    aj.rh_cost,
    aj.user_credit_cost,
    aj.profit,
    aj.waited_in_queue,
    aj.queue_wait_seconds,
    aj.processing_seconds,
    aj.created_at,
    aj.started_at,
    aj.completed_at
  FROM all_jobs aj
  LEFT JOIN profiles p ON p.id = aj.user_id
  WHERE (p_start_date IS NULL OR aj.created_at >= p_start_date)
    AND (p_end_date IS NULL OR aj.created_at <= p_end_date)
  ORDER BY aj.created_at DESC
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
END;
$$;

-- 2. get_ai_tools_usage_count - Count for pagination
DROP FUNCTION IF EXISTS get_ai_tools_usage_count(TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION get_ai_tools_usage_count(
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
    SELECT id FROM upscaler_jobs 
    WHERE user_id IS NOT NULL
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
    
    UNION ALL
    
    SELECT id FROM pose_changer_jobs 
    WHERE user_id IS NOT NULL
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
    
    UNION ALL
    
    SELECT id FROM veste_ai_jobs 
    WHERE user_id IS NOT NULL
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
    
    UNION ALL
    
    SELECT id FROM video_upscaler_jobs 
    WHERE user_id IS NOT NULL
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
    
    UNION ALL
    
    -- Arcano Cloner (NEW)
    SELECT id FROM arcano_cloner_jobs 
    WHERE user_id IS NOT NULL
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
  ) AS all_jobs;
  
  RETURN total_count;
END;
$$;

-- 3. get_ai_tools_usage_summary - Summary metrics
DROP FUNCTION IF EXISTS get_ai_tools_usage_summary(TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION get_ai_tools_usage_summary(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
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
    -- Upscaler Arcano jobs
    SELECT 
      uj.status,
      COALESCE(uj.rh_cost, 0) as rh_cost,
      COALESCE(uj.user_credit_cost, 0) as user_credit_cost,
      COALESCE(uj.waited_in_queue, false) as waited_in_queue,
      COALESCE(uj.queue_wait_seconds, 0) as queue_wait_seconds,
      CASE 
        WHEN uj.started_at IS NOT NULL AND uj.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (uj.completed_at - uj.started_at))::INTEGER
        ELSE 0
      END as processing_seconds
    FROM upscaler_jobs uj
    WHERE uj.user_id IS NOT NULL
      AND (p_start_date IS NULL OR uj.created_at >= p_start_date)
      AND (p_end_date IS NULL OR uj.created_at <= p_end_date)
    
    UNION ALL
    
    -- Pose Changer jobs
    SELECT 
      pcj.status,
      COALESCE(pcj.rh_cost, 0),
      COALESCE(pcj.user_credit_cost, 0),
      COALESCE(pcj.waited_in_queue, false),
      COALESCE(pcj.queue_wait_seconds, 0),
      CASE 
        WHEN pcj.started_at IS NOT NULL AND pcj.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (pcj.completed_at - pcj.started_at))::INTEGER
        ELSE 0
      END
    FROM pose_changer_jobs pcj
    WHERE pcj.user_id IS NOT NULL
      AND (p_start_date IS NULL OR pcj.created_at >= p_start_date)
      AND (p_end_date IS NULL OR pcj.created_at <= p_end_date)
    
    UNION ALL
    
    -- Veste AI jobs
    SELECT 
      vaj.status,
      COALESCE(vaj.rh_cost, 0),
      COALESCE(vaj.user_credit_cost, 0),
      COALESCE(vaj.waited_in_queue, false),
      COALESCE(vaj.queue_wait_seconds, 0),
      CASE 
        WHEN vaj.started_at IS NOT NULL AND vaj.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (vaj.completed_at - vaj.started_at))::INTEGER
        ELSE 0
      END
    FROM veste_ai_jobs vaj
    WHERE vaj.user_id IS NOT NULL
      AND (p_start_date IS NULL OR vaj.created_at >= p_start_date)
      AND (p_end_date IS NULL OR vaj.created_at <= p_end_date)
    
    UNION ALL
    
    -- Video Upscaler jobs
    SELECT 
      vuj.status,
      COALESCE(vuj.rh_cost, 0),
      COALESCE(vuj.user_credit_cost, 0),
      COALESCE(vuj.waited_in_queue, false),
      COALESCE(vuj.queue_wait_seconds, 0),
      CASE 
        WHEN vuj.started_at IS NOT NULL AND vuj.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (vuj.completed_at - vuj.started_at))::INTEGER
        ELSE 0
      END
    FROM video_upscaler_jobs vuj
    WHERE vuj.user_id IS NOT NULL
      AND (p_start_date IS NULL OR vuj.created_at >= p_start_date)
      AND (p_end_date IS NULL OR vuj.created_at <= p_end_date)
    
    UNION ALL
    
    -- Arcano Cloner jobs (NEW)
    SELECT 
      acj.status,
      COALESCE(acj.rh_cost, 0),
      COALESCE(acj.user_credit_cost, 0),
      COALESCE(acj.waited_in_queue, false),
      COALESCE(acj.queue_wait_seconds, 0),
      CASE 
        WHEN acj.started_at IS NOT NULL AND acj.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (acj.completed_at - acj.started_at))::INTEGER
        ELSE 0
      END
    FROM arcano_cloner_jobs acj
    WHERE acj.user_id IS NOT NULL
      AND (p_start_date IS NULL OR acj.created_at >= p_start_date)
      AND (p_end_date IS NULL OR acj.created_at <= p_end_date)
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

-- 4. get_ai_tools_cost_averages - Averages for profitability table
DROP FUNCTION IF EXISTS get_ai_tools_cost_averages();

CREATE OR REPLACE FUNCTION get_ai_tools_cost_averages()
RETURNS TABLE (
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
  -- Upscaler Arcano
  SELECT 
    'Upscaler Arcano'::TEXT as tool_name,
    COUNT(*)::BIGINT as total_jobs,
    COALESCE(ROUND(AVG(rh_cost)::NUMERIC, 2), 0) as avg_rh_cost,
    COALESCE(ROUND(AVG(user_credit_cost)::NUMERIC, 2), 0) as avg_credit_cost,
    COALESCE(SUM(rh_cost)::NUMERIC, 0) as total_rh_cost,
    COALESCE(SUM(user_credit_cost)::NUMERIC, 0) as total_credit_cost
  FROM upscaler_jobs
  WHERE status = 'completed'
  
  UNION ALL
  
  -- Pose Changer
  SELECT 
    'Pose Changer'::TEXT as tool_name,
    COUNT(*)::BIGINT as total_jobs,
    COALESCE(ROUND(AVG(rh_cost)::NUMERIC, 2), 0) as avg_rh_cost,
    COALESCE(ROUND(AVG(user_credit_cost)::NUMERIC, 2), 0) as avg_credit_cost,
    COALESCE(SUM(rh_cost)::NUMERIC, 0) as total_rh_cost,
    COALESCE(SUM(user_credit_cost)::NUMERIC, 0) as total_credit_cost
  FROM pose_changer_jobs
  WHERE status = 'completed'
  
  UNION ALL
  
  -- Veste AI
  SELECT 
    'Veste AI'::TEXT as tool_name,
    COUNT(*)::BIGINT as total_jobs,
    COALESCE(ROUND(AVG(rh_cost)::NUMERIC, 2), 0) as avg_rh_cost,
    COALESCE(ROUND(AVG(user_credit_cost)::NUMERIC, 2), 0) as avg_credit_cost,
    COALESCE(SUM(rh_cost)::NUMERIC, 0) as total_rh_cost,
    COALESCE(SUM(user_credit_cost)::NUMERIC, 0) as total_credit_cost
  FROM veste_ai_jobs
  WHERE status = 'completed'
  
  UNION ALL
  
  -- Video Upscaler
  SELECT 
    'Video Upscaler'::TEXT as tool_name,
    COUNT(*)::BIGINT as total_jobs,
    COALESCE(ROUND(AVG(rh_cost)::NUMERIC, 2), 0) as avg_rh_cost,
    COALESCE(ROUND(AVG(user_credit_cost)::NUMERIC, 2), 0) as avg_credit_cost,
    COALESCE(SUM(rh_cost)::NUMERIC, 0) as total_rh_cost,
    COALESCE(SUM(user_credit_cost)::NUMERIC, 0) as total_credit_cost
  FROM video_upscaler_jobs
  WHERE status = 'completed'
  
  UNION ALL
  
  -- Arcano Cloner (NEW)
  SELECT 
    'Arcano Cloner'::TEXT as tool_name,
    COUNT(*)::BIGINT as total_jobs,
    COALESCE(ROUND(AVG(rh_cost)::NUMERIC, 2), 0) as avg_rh_cost,
    COALESCE(ROUND(AVG(user_credit_cost)::NUMERIC, 2), 0) as avg_credit_cost,
    COALESCE(SUM(rh_cost)::NUMERIC, 0) as total_rh_cost,
    COALESCE(SUM(user_credit_cost)::NUMERIC, 0) as total_credit_cost
  FROM arcano_cloner_jobs
  WHERE status = 'completed';
END;
$$;