
-- Update both overloads of get_ai_tools_usage to include failed_at_step

-- 1. Drop and recreate the paginated version (p_page, p_page_size)
DROP FUNCTION IF EXISTS get_ai_tools_usage(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.get_ai_tools_usage(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20
) RETURNS TABLE(
  id UUID, tool_name TEXT, user_id UUID, user_email TEXT, user_name TEXT,
  status TEXT, error_message TEXT, failed_at_step TEXT, rh_cost NUMERIC, user_credit_cost NUMERIC, profit NUMERIC,
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
    SELECT uj.id, 'Upscaler Arcano'::TEXT as tool_name, uj.user_id, uj.status, uj.error_message, uj.failed_at_step,
      COALESCE(uj.rh_cost, 0)::NUMERIC as rh_cost, COALESCE(uj.user_credit_cost, 0)::NUMERIC as user_credit_cost,
      (COALESCE(uj.user_credit_cost, 0) - COALESCE(uj.rh_cost, 0))::NUMERIC as profit,
      COALESCE(uj.waited_in_queue, false) as waited_in_queue, COALESCE(uj.queue_wait_seconds, 0) as queue_wait_seconds,
      CASE WHEN uj.started_at IS NOT NULL AND uj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (uj.completed_at - uj.started_at))::INTEGER ELSE 0 END as processing_seconds,
      uj.created_at, uj.started_at, uj.completed_at
    FROM upscaler_jobs uj
    WHERE uj.user_id IS NOT NULL AND (p_start_date IS NULL OR uj.created_at >= p_start_date) AND (p_end_date IS NULL OR uj.created_at <= p_end_date)
    UNION ALL
    SELECT pcj.id, 'Pose Changer'::TEXT, pcj.user_id, pcj.status, pcj.error_message, pcj.failed_at_step,
      COALESCE(pcj.rh_cost, 0)::NUMERIC, COALESCE(pcj.user_credit_cost, 0)::NUMERIC,
      (COALESCE(pcj.user_credit_cost, 0) - COALESCE(pcj.rh_cost, 0))::NUMERIC,
      COALESCE(pcj.waited_in_queue, false), COALESCE(pcj.queue_wait_seconds, 0),
      CASE WHEN pcj.started_at IS NOT NULL AND pcj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (pcj.completed_at - pcj.started_at))::INTEGER ELSE 0 END,
      pcj.created_at, pcj.started_at, pcj.completed_at
    FROM pose_changer_jobs pcj
    WHERE pcj.user_id IS NOT NULL AND (p_start_date IS NULL OR pcj.created_at >= p_start_date) AND (p_end_date IS NULL OR pcj.created_at <= p_end_date)
    UNION ALL
    SELECT vaj.id, 'Veste AI'::TEXT, vaj.user_id, vaj.status, vaj.error_message, vaj.failed_at_step,
      COALESCE(vaj.rh_cost, 0)::NUMERIC, COALESCE(vaj.user_credit_cost, 0)::NUMERIC,
      (COALESCE(vaj.user_credit_cost, 0) - COALESCE(vaj.rh_cost, 0))::NUMERIC,
      COALESCE(vaj.waited_in_queue, false), COALESCE(vaj.queue_wait_seconds, 0),
      CASE WHEN vaj.started_at IS NOT NULL AND vaj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (vaj.completed_at - vaj.started_at))::INTEGER ELSE 0 END,
      vaj.created_at, vaj.started_at, vaj.completed_at
    FROM veste_ai_jobs vaj
    WHERE vaj.user_id IS NOT NULL AND (p_start_date IS NULL OR vaj.created_at >= p_start_date) AND (p_end_date IS NULL OR vaj.created_at <= p_end_date)
    UNION ALL
    SELECT vuj.id, 'Video Upscaler'::TEXT, vuj.user_id, vuj.status, vuj.error_message, vuj.failed_at_step,
      COALESCE(vuj.rh_cost, 0)::NUMERIC, COALESCE(vuj.user_credit_cost, 0)::NUMERIC,
      (COALESCE(vuj.user_credit_cost, 0) - COALESCE(vuj.rh_cost, 0))::NUMERIC,
      COALESCE(vuj.waited_in_queue, false), COALESCE(vuj.queue_wait_seconds, 0),
      CASE WHEN vuj.started_at IS NOT NULL AND vuj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (vuj.completed_at - vuj.started_at))::INTEGER ELSE 0 END,
      vuj.created_at, vuj.started_at, vuj.completed_at
    FROM video_upscaler_jobs vuj
    WHERE vuj.user_id IS NOT NULL AND (p_start_date IS NULL OR vuj.created_at >= p_start_date) AND (p_end_date IS NULL OR vuj.created_at <= p_end_date)
    UNION ALL
    SELECT acj.id, 'Arcano Cloner'::TEXT, acj.user_id, acj.status, acj.error_message, acj.failed_at_step,
      COALESCE(acj.rh_cost, 0)::NUMERIC, COALESCE(acj.user_credit_cost, 0)::NUMERIC,
      (COALESCE(acj.user_credit_cost, 0) - COALESCE(acj.rh_cost, 0))::NUMERIC,
      COALESCE(acj.waited_in_queue, false), COALESCE(acj.queue_wait_seconds, 0),
      CASE WHEN acj.started_at IS NOT NULL AND acj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (acj.completed_at - acj.started_at))::INTEGER ELSE 0 END,
      acj.created_at, acj.started_at, acj.completed_at
    FROM arcano_cloner_jobs acj
    WHERE acj.user_id IS NOT NULL AND (p_start_date IS NULL OR acj.created_at >= p_start_date) AND (p_end_date IS NULL OR acj.created_at <= p_end_date)
    UNION ALL
    SELECT cgj.id, 'Gerador Avatar'::TEXT, cgj.user_id, cgj.status, cgj.error_message, cgj.failed_at_step,
      COALESCE(cgj.rh_cost, 0)::NUMERIC, COALESCE(cgj.user_credit_cost, 0)::NUMERIC,
      (COALESCE(cgj.user_credit_cost, 0) - COALESCE(cgj.rh_cost, 0))::NUMERIC,
      COALESCE(cgj.waited_in_queue, false), COALESCE(cgj.queue_wait_seconds, 0),
      CASE WHEN cgj.started_at IS NOT NULL AND cgj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (cgj.completed_at - cgj.started_at))::INTEGER ELSE 0 END,
      cgj.created_at, cgj.started_at, cgj.completed_at
    FROM character_generator_jobs cgj
    WHERE cgj.user_id IS NOT NULL AND (p_start_date IS NULL OR cgj.created_at >= p_start_date) AND (p_end_date IS NULL OR cgj.created_at <= p_end_date)
    UNION ALL
    SELECT fmj.id, 'Flyer Maker'::TEXT, fmj.user_id, fmj.status, fmj.error_message, fmj.failed_at_step,
      COALESCE(fmj.rh_cost, 0)::NUMERIC, COALESCE(fmj.user_credit_cost, 0)::NUMERIC,
      (COALESCE(fmj.user_credit_cost, 0) - COALESCE(fmj.rh_cost, 0))::NUMERIC,
      COALESCE(fmj.waited_in_queue, false), COALESCE(fmj.queue_wait_seconds, 0),
      CASE WHEN fmj.started_at IS NOT NULL AND fmj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (fmj.completed_at - fmj.started_at))::INTEGER ELSE 0 END,
      fmj.created_at, fmj.started_at, fmj.completed_at
    FROM flyer_maker_jobs fmj
    WHERE fmj.user_id IS NOT NULL AND (p_start_date IS NULL OR fmj.created_at >= p_start_date) AND (p_end_date IS NULL OR fmj.created_at <= p_end_date)
    UNION ALL
    SELECT brj.id, 'Remover Fundo'::TEXT, brj.user_id, brj.status, brj.error_message, brj.failed_at_step,
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
    aj.status, aj.error_message, aj.failed_at_step,
    aj.rh_cost, aj.user_credit_cost, aj.profit,
    aj.waited_in_queue, aj.queue_wait_seconds, aj.processing_seconds,
    aj.created_at, aj.started_at, aj.completed_at
  FROM all_jobs aj
  LEFT JOIN profiles p ON p.id = aj.user_id
  ORDER BY aj.created_at DESC
  LIMIT p_page_size OFFSET v_offset;
END;
$$;

-- 2. Drop and recreate the filter version (p_tool_filter, p_status_filter, p_user_email)
DROP FUNCTION IF EXISTS get_ai_tools_usage(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.get_ai_tools_usage(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_tool_filter TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID, tool_name TEXT, user_id UUID, user_email TEXT,
  status TEXT, error_message TEXT, failed_at_step TEXT, rh_cost NUMERIC, user_credit_cost NUMERIC, profit NUMERIC,
  waited_in_queue BOOLEAN, queue_wait_seconds INTEGER, processing_seconds INTEGER,
  created_at TIMESTAMPTZ, started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH all_jobs AS (
    SELECT uj.id, 'Upscaler Arcano'::TEXT as tool_name, uj.user_id, uj.status, uj.error_message, uj.failed_at_step,
      COALESCE(uj.rh_cost, 0)::NUMERIC as rh_cost, COALESCE(uj.user_credit_cost, 0)::NUMERIC as user_credit_cost,
      (COALESCE(uj.user_credit_cost, 0) - COALESCE(uj.rh_cost, 0))::NUMERIC as profit,
      COALESCE(uj.waited_in_queue, false) as waited_in_queue, COALESCE(uj.queue_wait_seconds, 0) as queue_wait_seconds,
      CASE WHEN uj.started_at IS NOT NULL AND uj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (uj.completed_at - uj.started_at))::INTEGER ELSE 0 END as processing_seconds,
      uj.created_at, uj.started_at, uj.completed_at
    FROM upscaler_jobs uj WHERE uj.user_id IS NOT NULL
    UNION ALL
    SELECT pcj.id, 'Pose Changer'::TEXT, pcj.user_id, pcj.status, pcj.error_message, pcj.failed_at_step,
      COALESCE(pcj.rh_cost, 0)::NUMERIC, COALESCE(pcj.user_credit_cost, 0)::NUMERIC,
      (COALESCE(pcj.user_credit_cost, 0) - COALESCE(pcj.rh_cost, 0))::NUMERIC,
      COALESCE(pcj.waited_in_queue, false), COALESCE(pcj.queue_wait_seconds, 0),
      CASE WHEN pcj.started_at IS NOT NULL AND pcj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (pcj.completed_at - pcj.started_at))::INTEGER ELSE 0 END,
      pcj.created_at, pcj.started_at, pcj.completed_at
    FROM pose_changer_jobs pcj WHERE pcj.user_id IS NOT NULL
    UNION ALL
    SELECT vaj.id, 'Veste AI'::TEXT, vaj.user_id, vaj.status, vaj.error_message, vaj.failed_at_step,
      COALESCE(vaj.rh_cost, 0)::NUMERIC, COALESCE(vaj.user_credit_cost, 0)::NUMERIC,
      (COALESCE(vaj.user_credit_cost, 0) - COALESCE(vaj.rh_cost, 0))::NUMERIC,
      COALESCE(vaj.waited_in_queue, false), COALESCE(vaj.queue_wait_seconds, 0),
      CASE WHEN vaj.started_at IS NOT NULL AND vaj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (vaj.completed_at - vaj.started_at))::INTEGER ELSE 0 END,
      vaj.created_at, vaj.started_at, vaj.completed_at
    FROM veste_ai_jobs vaj WHERE vaj.user_id IS NOT NULL
    UNION ALL
    SELECT vuj.id, 'Video Upscaler'::TEXT, vuj.user_id, vuj.status, vuj.error_message, vuj.failed_at_step,
      COALESCE(vuj.rh_cost, 0)::NUMERIC, COALESCE(vuj.user_credit_cost, 0)::NUMERIC,
      (COALESCE(vuj.user_credit_cost, 0) - COALESCE(vuj.rh_cost, 0))::NUMERIC,
      COALESCE(vuj.waited_in_queue, false), COALESCE(vuj.queue_wait_seconds, 0),
      CASE WHEN vuj.started_at IS NOT NULL AND vuj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (vuj.completed_at - vuj.started_at))::INTEGER ELSE 0 END,
      vuj.created_at, vuj.started_at, vuj.completed_at
    FROM video_upscaler_jobs vuj WHERE vuj.user_id IS NOT NULL
    UNION ALL
    SELECT acj.id, 'Arcano Cloner'::TEXT, acj.user_id, acj.status, acj.error_message, acj.failed_at_step,
      COALESCE(acj.rh_cost, 0)::NUMERIC, COALESCE(acj.user_credit_cost, 0)::NUMERIC,
      (COALESCE(acj.user_credit_cost, 0) - COALESCE(acj.rh_cost, 0))::NUMERIC,
      COALESCE(acj.waited_in_queue, false), COALESCE(acj.queue_wait_seconds, 0),
      CASE WHEN acj.started_at IS NOT NULL AND acj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (acj.completed_at - acj.started_at))::INTEGER ELSE 0 END,
      acj.created_at, acj.started_at, acj.completed_at
    FROM arcano_cloner_jobs acj WHERE acj.user_id IS NOT NULL
    UNION ALL
    SELECT cgj.id, 'Gerador Avatar'::TEXT, cgj.user_id, cgj.status, cgj.error_message, cgj.failed_at_step,
      COALESCE(cgj.rh_cost, 0)::NUMERIC, COALESCE(cgj.user_credit_cost, 0)::NUMERIC,
      (COALESCE(cgj.user_credit_cost, 0) - COALESCE(cgj.rh_cost, 0))::NUMERIC,
      COALESCE(cgj.waited_in_queue, false), COALESCE(cgj.queue_wait_seconds, 0),
      CASE WHEN cgj.started_at IS NOT NULL AND cgj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (cgj.completed_at - cgj.started_at))::INTEGER ELSE 0 END,
      cgj.created_at, cgj.started_at, cgj.completed_at
    FROM character_generator_jobs cgj WHERE cgj.user_id IS NOT NULL
    UNION ALL
    SELECT fmj.id, 'Flyer Maker'::TEXT, fmj.user_id, fmj.status, fmj.error_message, fmj.failed_at_step,
      COALESCE(fmj.rh_cost, 0)::NUMERIC, COALESCE(fmj.user_credit_cost, 0)::NUMERIC,
      (COALESCE(fmj.user_credit_cost, 0) - COALESCE(fmj.rh_cost, 0))::NUMERIC,
      COALESCE(fmj.waited_in_queue, false), COALESCE(fmj.queue_wait_seconds, 0),
      CASE WHEN fmj.started_at IS NOT NULL AND fmj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (fmj.completed_at - fmj.started_at))::INTEGER ELSE 0 END,
      fmj.created_at, fmj.started_at, fmj.completed_at
    FROM flyer_maker_jobs fmj WHERE fmj.user_id IS NOT NULL
    UNION ALL
    SELECT brj.id, 'Remover Fundo'::TEXT, brj.user_id, brj.status, brj.error_message, brj.failed_at_step,
      COALESCE(brj.rh_cost, 0)::NUMERIC, COALESCE(brj.user_credit_cost, 0)::NUMERIC,
      (COALESCE(brj.user_credit_cost, 0) - COALESCE(brj.rh_cost, 0))::NUMERIC,
      COALESCE(brj.waited_in_queue, false), COALESCE(brj.queue_wait_seconds, 0),
      CASE WHEN brj.started_at IS NOT NULL AND brj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (brj.completed_at - brj.started_at))::INTEGER ELSE 0 END,
      brj.created_at, brj.started_at, brj.completed_at
    FROM bg_remover_jobs brj WHERE brj.user_id IS NOT NULL
  )
  SELECT 
    aj.id, aj.tool_name, aj.user_id,
    COALESCE(p.email, 'N/A')::TEXT as user_email,
    aj.status, aj.error_message, aj.failed_at_step,
    aj.rh_cost, aj.user_credit_cost, aj.profit,
    aj.waited_in_queue, aj.queue_wait_seconds, aj.processing_seconds,
    aj.created_at, aj.started_at, aj.completed_at
  FROM all_jobs aj
  LEFT JOIN profiles p ON p.id = aj.user_id
  WHERE 
    (p_start_date IS NULL OR aj.created_at >= p_start_date)
    AND (p_end_date IS NULL OR aj.created_at <= p_end_date)
    AND (p_tool_filter IS NULL OR aj.tool_name = p_tool_filter)
    AND (p_status_filter IS NULL OR aj.status = p_status_filter)
    AND (p_user_email IS NULL OR p.email ILIKE '%' || p_user_email || '%')
  ORDER BY aj.created_at DESC
  LIMIT 200;
END;
$function$;
