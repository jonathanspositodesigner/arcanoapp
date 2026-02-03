-- Atualizar as 3 funções RPC para incluir video_upscaler_jobs

-- 1. get_ai_tools_usage - recria a função incluindo Video Upscaler
CREATE OR REPLACE FUNCTION public.get_ai_tools_usage(p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_page integer DEFAULT 1, p_page_size integer DEFAULT 20)
 RETURNS TABLE(id uuid, tool_name text, user_id uuid, user_email text, user_name text, status text, rh_cost integer, user_credit_cost integer, profit integer, waited_in_queue boolean, queue_wait_seconds integer, processing_seconds integer, created_at timestamp with time zone, started_at timestamp with time zone, completed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_offset INTEGER;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  RETURN QUERY
  WITH all_jobs AS (
    -- Upscaler jobs (imagem)
    SELECT 
      uj.id,
      'Upscaler Arcano'::TEXT as tool_name,
      uj.user_id,
      uj.status,
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
    
    -- Video Upscaler jobs
    SELECT 
      vuj.id,
      'Video Upscaler'::TEXT as tool_name,
      vuj.user_id,
      vuj.status,
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
    
    -- Pose Changer jobs
    SELECT 
      pcj.id,
      'Pose Changer'::TEXT as tool_name,
      pcj.user_id,
      pcj.status,
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
  )
  SELECT 
    aj.id,
    aj.tool_name,
    aj.user_id,
    COALESCE(p.email, '') as user_email,
    COALESCE(p.name, '') as user_name,
    aj.status,
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
  ORDER BY aj.created_at DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$function$;

-- 2. get_ai_tools_usage_count - recria incluindo Video Upscaler
CREATE OR REPLACE FUNCTION public.get_ai_tools_usage_count(p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM (
    SELECT id FROM upscaler_jobs 
    WHERE user_id IS NOT NULL 
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
    UNION ALL
    SELECT id FROM video_upscaler_jobs 
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
  ) combined;
  
  RETURN v_count;
END;
$function$;

-- 3. get_ai_tools_usage_summary - recria incluindo Video Upscaler
CREATE OR REPLACE FUNCTION public.get_ai_tools_usage_summary(p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(total_jobs integer, completed_jobs integer, failed_jobs integer, total_rh_cost integer, total_user_credits integer, total_profit integer, jobs_with_queue integer, avg_queue_wait_seconds numeric, avg_processing_seconds numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH all_jobs AS (
    -- Upscaler jobs (imagem)
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
  )
  SELECT 
    COUNT(*)::INTEGER as total_jobs,
    COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as completed_jobs,
    COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as failed_jobs,
    COALESCE(SUM(rh_cost), 0)::INTEGER as total_rh_cost,
    COALESCE(SUM(user_credit_cost), 0)::INTEGER as total_user_credits,
    COALESCE(SUM(user_credit_cost) - SUM(rh_cost), 0)::INTEGER as total_profit,
    COUNT(*) FILTER (WHERE waited_in_queue = true)::INTEGER as jobs_with_queue,
    COALESCE(AVG(queue_wait_seconds) FILTER (WHERE waited_in_queue = true), 0) as avg_queue_wait_seconds,
    COALESCE(AVG(processing_seconds) FILTER (WHERE status = 'completed'), 0) as avg_processing_seconds
  FROM all_jobs;
END;
$function$;