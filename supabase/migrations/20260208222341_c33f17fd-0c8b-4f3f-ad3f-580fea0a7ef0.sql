-- Corrigir a função get_ai_tools_usage (versão com paginação)
-- Adicionando casts explícitos ::NUMERIC para evitar type mismatch

CREATE OR REPLACE FUNCTION public.get_ai_tools_usage(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
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
  created_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INTEGER;
BEGIN
  -- Security check: only admins can view all AI tools usage
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  v_offset := (p_page - 1) * p_page_size;

  RETURN QUERY
  WITH all_jobs AS (
    -- Upscaler jobs
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
      AND (p_start_date IS NULL OR uj.created_at >= p_start_date)
      AND (p_end_date IS NULL OR uj.created_at <= p_end_date)
    
    UNION ALL
    
    -- Pose Changer jobs
    SELECT 
      pcj.id,
      'Pose Changer'::TEXT as tool_name,
      pcj.user_id,
      pcj.status,
      pcj.error_message,
      COALESCE(pcj.rh_cost, 0)::NUMERIC as rh_cost,
      COALESCE(pcj.user_credit_cost, 0)::NUMERIC as user_credit_cost,
      (COALESCE(pcj.user_credit_cost, 0) - COALESCE(pcj.rh_cost, 0))::NUMERIC as profit,
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
      AND (p_start_date IS NULL OR pcj.created_at >= p_start_date)
      AND (p_end_date IS NULL OR pcj.created_at <= p_end_date)
    
    UNION ALL
    
    -- Veste AI jobs
    SELECT 
      vaj.id,
      'Veste AI'::TEXT as tool_name,
      vaj.user_id,
      vaj.status,
      vaj.error_message,
      COALESCE(vaj.rh_cost, 0)::NUMERIC as rh_cost,
      COALESCE(vaj.user_credit_cost, 0)::NUMERIC as user_credit_cost,
      (COALESCE(vaj.user_credit_cost, 0) - COALESCE(vaj.rh_cost, 0))::NUMERIC as profit,
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
      AND (p_start_date IS NULL OR vaj.created_at >= p_start_date)
      AND (p_end_date IS NULL OR vaj.created_at <= p_end_date)
    
    UNION ALL
    
    -- Video Upscaler jobs
    SELECT 
      vuj.id,
      'Video Upscaler'::TEXT as tool_name,
      vuj.user_id,
      vuj.status,
      vuj.error_message,
      COALESCE(vuj.rh_cost, 0)::NUMERIC as rh_cost,
      COALESCE(vuj.user_credit_cost, 0)::NUMERIC as user_credit_cost,
      (COALESCE(vuj.user_credit_cost, 0) - COALESCE(vuj.rh_cost, 0))::NUMERIC as profit,
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
      AND (p_start_date IS NULL OR vuj.created_at >= p_start_date)
      AND (p_end_date IS NULL OR vuj.created_at <= p_end_date)
    
    UNION ALL
    
    -- Arcano Cloner jobs
    SELECT 
      acj.id,
      'Arcano Cloner'::TEXT as tool_name,
      acj.user_id,
      acj.status,
      acj.error_message,
      COALESCE(acj.rh_cost, 0)::NUMERIC as rh_cost,
      COALESCE(acj.user_credit_cost, 0)::NUMERIC as user_credit_cost,
      (COALESCE(acj.user_credit_cost, 0) - COALESCE(acj.rh_cost, 0))::NUMERIC as profit,
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
      AND (p_start_date IS NULL OR acj.created_at >= p_start_date)
      AND (p_end_date IS NULL OR acj.created_at <= p_end_date)
  )
  SELECT 
    aj.id,
    aj.tool_name,
    aj.user_id,
    COALESCE(p.email, 'N/A') as user_email,
    COALESCE(p.name, 'N/A') as user_name,
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
  ORDER BY aj.created_at DESC
  OFFSET v_offset
  LIMIT p_page_size;
END;
$$;