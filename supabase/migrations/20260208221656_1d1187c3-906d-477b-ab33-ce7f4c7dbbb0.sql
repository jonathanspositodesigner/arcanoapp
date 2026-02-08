-- Fix type mismatch: cast INTEGER columns to NUMERIC to match function signature
CREATE OR REPLACE FUNCTION public.get_ai_tools_usage(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_tool_filter TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  tool_name TEXT,
  user_id UUID,
  user_email TEXT,
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
    -- Upscaler Arcano
    SELECT 
      uj.id,
      'Upscaler Arcano'::TEXT as tool_name,
      uj.user_id,
      uj.status,
      uj.error_message,
      COALESCE(uj.rh_cost, 0)::NUMERIC as rh_cost,
      COALESCE(uj.user_credit_cost, 0)::NUMERIC as user_credit_cost,
      (COALESCE(uj.user_credit_cost, 0) - COALESCE(uj.rh_cost, 0))::NUMERIC as profit,
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
    
    -- Pose Changer
    SELECT 
      pj.id,
      'Pose Changer'::TEXT as tool_name,
      pj.user_id,
      pj.status,
      pj.error_message,
      COALESCE(pj.rh_cost, 0)::NUMERIC as rh_cost,
      COALESCE(pj.user_credit_cost, 0)::NUMERIC as user_credit_cost,
      (COALESCE(pj.user_credit_cost, 0) - COALESCE(pj.rh_cost, 0))::NUMERIC as profit,
      COALESCE(pj.waited_in_queue, false) as waited_in_queue,
      COALESCE(pj.queue_wait_seconds, 0) as queue_wait_seconds,
      CASE 
        WHEN pj.started_at IS NOT NULL AND pj.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (pj.completed_at - pj.started_at))::INTEGER
        ELSE 0
      END as processing_seconds,
      pj.created_at,
      pj.started_at,
      pj.completed_at
    FROM pose_changer_jobs pj
    WHERE pj.user_id IS NOT NULL
    
    UNION ALL
    
    -- Veste AI
    SELECT 
      vj.id,
      'Veste AI'::TEXT as tool_name,
      vj.user_id,
      vj.status,
      vj.error_message,
      COALESCE(vj.rh_cost, 0)::NUMERIC as rh_cost,
      COALESCE(vj.user_credit_cost, 0)::NUMERIC as user_credit_cost,
      (COALESCE(vj.user_credit_cost, 0) - COALESCE(vj.rh_cost, 0))::NUMERIC as profit,
      COALESCE(vj.waited_in_queue, false) as waited_in_queue,
      COALESCE(vj.queue_wait_seconds, 0) as queue_wait_seconds,
      CASE 
        WHEN vj.started_at IS NOT NULL AND vj.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (vj.completed_at - vj.started_at))::INTEGER
        ELSE 0
      END as processing_seconds,
      vj.created_at,
      vj.started_at,
      vj.completed_at
    FROM veste_ai_jobs vj
    WHERE vj.user_id IS NOT NULL
    
    UNION ALL
    
    -- Video Upscaler
    SELECT 
      vu.id,
      'Video Upscaler'::TEXT as tool_name,
      vu.user_id,
      vu.status,
      vu.error_message,
      COALESCE(vu.rh_cost, 0)::NUMERIC as rh_cost,
      COALESCE(vu.user_credit_cost, 0)::NUMERIC as user_credit_cost,
      (COALESCE(vu.user_credit_cost, 0) - COALESCE(vu.rh_cost, 0))::NUMERIC as profit,
      COALESCE(vu.waited_in_queue, false) as waited_in_queue,
      COALESCE(vu.queue_wait_seconds, 0) as queue_wait_seconds,
      CASE 
        WHEN vu.started_at IS NOT NULL AND vu.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (vu.completed_at - vu.started_at))::INTEGER
        ELSE 0
      END as processing_seconds,
      vu.created_at,
      vu.started_at,
      vu.completed_at
    FROM video_upscaler_jobs vu
    WHERE vu.user_id IS NOT NULL
    
    UNION ALL
    
    -- Arcano Cloner
    SELECT 
      ac.id,
      'Arcano Cloner'::TEXT as tool_name,
      ac.user_id,
      ac.status,
      ac.error_message,
      COALESCE(ac.rh_cost, 0)::NUMERIC as rh_cost,
      COALESCE(ac.user_credit_cost, 0)::NUMERIC as user_credit_cost,
      (COALESCE(ac.user_credit_cost, 0) - COALESCE(ac.rh_cost, 0))::NUMERIC as profit,
      COALESCE(ac.waited_in_queue, false) as waited_in_queue,
      COALESCE(ac.queue_wait_seconds, 0) as queue_wait_seconds,
      CASE 
        WHEN ac.started_at IS NOT NULL AND ac.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (ac.completed_at - ac.started_at))::INTEGER
        ELSE 0
      END as processing_seconds,
      ac.created_at,
      ac.started_at,
      ac.completed_at
    FROM arcano_cloner_jobs ac
    WHERE ac.user_id IS NOT NULL
  )
  SELECT 
    aj.id,
    aj.tool_name,
    aj.user_id,
    p.email as user_email,
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
  WHERE 
    (p_start_date IS NULL OR aj.created_at >= p_start_date)
    AND (p_end_date IS NULL OR aj.created_at <= p_end_date)
    AND (p_tool_filter IS NULL OR aj.tool_name = p_tool_filter)
    AND (p_status_filter IS NULL OR aj.status = p_status_filter)
    AND (p_user_email IS NULL OR p.email ILIKE '%' || p_user_email || '%')
  ORDER BY aj.created_at DESC;
END;
$$;