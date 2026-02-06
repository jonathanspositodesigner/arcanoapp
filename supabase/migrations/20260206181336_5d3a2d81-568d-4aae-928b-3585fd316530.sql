-- Dropar função existente e recriar com error_message
DROP FUNCTION IF EXISTS public.get_ai_tools_usage(timestamp with time zone, timestamp with time zone, integer, integer);

CREATE OR REPLACE FUNCTION public.get_ai_tools_usage(p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_page integer DEFAULT 1, p_page_size integer DEFAULT 20)
 RETURNS TABLE(id uuid, tool_name text, user_id uuid, user_email text, user_name text, status text, error_message text, rh_cost integer, user_credit_cost integer, profit integer, waited_in_queue boolean, queue_wait_seconds integer, processing_seconds integer, created_at timestamp with time zone, started_at timestamp with time zone, completed_at timestamp with time zone)
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
      CASE WHEN uj.started_at IS NOT NULL AND uj.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (uj.completed_at - uj.started_at))::INTEGER ELSE 0 END as processing_seconds,
      uj.created_at, uj.started_at, uj.completed_at
    FROM upscaler_jobs uj WHERE uj.user_id IS NOT NULL
    
    UNION ALL
    
    SELECT 
      vuj.id, 'Video Upscaler'::TEXT, vuj.user_id, vuj.status, vuj.error_message,
      COALESCE(vuj.rh_cost, 0), COALESCE(vuj.user_credit_cost, 0),
      COALESCE(vuj.user_credit_cost, 0) - COALESCE(vuj.rh_cost, 0),
      COALESCE(vuj.waited_in_queue, false), COALESCE(vuj.queue_wait_seconds, 0),
      CASE WHEN vuj.started_at IS NOT NULL AND vuj.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (vuj.completed_at - vuj.started_at))::INTEGER ELSE 0 END,
      vuj.created_at, vuj.started_at, vuj.completed_at
    FROM video_upscaler_jobs vuj WHERE vuj.user_id IS NOT NULL
    
    UNION ALL
    
    SELECT 
      pcj.id, 'Pose Changer'::TEXT, pcj.user_id, pcj.status, pcj.error_message,
      COALESCE(pcj.rh_cost, 0), COALESCE(pcj.user_credit_cost, 0),
      COALESCE(pcj.user_credit_cost, 0) - COALESCE(pcj.rh_cost, 0),
      COALESCE(pcj.waited_in_queue, false), COALESCE(pcj.queue_wait_seconds, 0),
      CASE WHEN pcj.started_at IS NOT NULL AND pcj.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (pcj.completed_at - pcj.started_at))::INTEGER ELSE 0 END,
      pcj.created_at, pcj.started_at, pcj.completed_at
    FROM pose_changer_jobs pcj WHERE pcj.user_id IS NOT NULL
    
    UNION ALL
    
    SELECT 
      vaj.id, 'Veste AI'::TEXT, vaj.user_id, vaj.status, vaj.error_message,
      COALESCE(vaj.rh_cost, 0), COALESCE(vaj.user_credit_cost, 0),
      COALESCE(vaj.user_credit_cost, 0) - COALESCE(vaj.rh_cost, 0),
      COALESCE(vaj.waited_in_queue, false), COALESCE(vaj.queue_wait_seconds, 0),
      CASE WHEN vaj.started_at IS NOT NULL AND vaj.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (vaj.completed_at - vaj.started_at))::INTEGER ELSE 0 END,
      vaj.created_at, vaj.started_at, vaj.completed_at
    FROM veste_ai_jobs vaj WHERE vaj.user_id IS NOT NULL
  )
  SELECT aj.id, aj.tool_name, aj.user_id, COALESCE(p.email, ''), COALESCE(p.name, ''),
    aj.status, aj.error_message, aj.rh_cost, aj.user_credit_cost, aj.profit,
    aj.waited_in_queue, aj.queue_wait_seconds, aj.processing_seconds,
    aj.created_at, aj.started_at, aj.completed_at
  FROM all_jobs aj
  LEFT JOIN profiles p ON p.id = aj.user_id
  WHERE (p_start_date IS NULL OR aj.created_at >= p_start_date)
    AND (p_end_date IS NULL OR aj.created_at <= p_end_date)
  ORDER BY aj.created_at DESC
  LIMIT p_page_size OFFSET v_offset;
END;
$function$;