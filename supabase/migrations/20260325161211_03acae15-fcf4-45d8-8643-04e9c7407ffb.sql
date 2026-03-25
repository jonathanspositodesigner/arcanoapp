
-- Update get_ai_tools_usage (paginated version) to include image_generator_jobs and video_generator_jobs
CREATE OR REPLACE FUNCTION public.get_ai_tools_usage(p_start_date timestamp with time zone DEFAULT NULL, p_end_date timestamp with time zone DEFAULT NULL, p_page integer DEFAULT 1, p_page_size integer DEFAULT 20)
 RETURNS TABLE(id uuid, tool_name text, user_id uuid, user_email text, user_name text, status text, error_message text, failed_at_step text, rh_cost numeric, user_credit_cost numeric, profit numeric, waited_in_queue boolean, queue_wait_seconds integer, processing_seconds integer, created_at timestamp with time zone, started_at timestamp with time zone, completed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    UNION ALL
    SELECT igj.id, 'Gerar Imagem'::TEXT, igj.user_id, igj.status, igj.error_message, NULL::TEXT as failed_at_step,
      0::NUMERIC as rh_cost, COALESCE(igj.user_credit_cost, 0)::NUMERIC as user_credit_cost,
      COALESCE(igj.user_credit_cost, 0)::NUMERIC as profit,
      false as waited_in_queue, 0 as queue_wait_seconds,
      CASE WHEN igj.created_at IS NOT NULL AND igj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (igj.completed_at - igj.created_at))::INTEGER ELSE 0 END as processing_seconds,
      igj.created_at, igj.created_at as started_at, igj.completed_at
    FROM image_generator_jobs igj
    WHERE igj.user_id IS NOT NULL AND (p_start_date IS NULL OR igj.created_at >= p_start_date) AND (p_end_date IS NULL OR igj.created_at <= p_end_date)
    UNION ALL
    SELECT vgj.id, 'Gerar Vídeo'::TEXT, vgj.user_id, vgj.status, vgj.error_message, NULL::TEXT as failed_at_step,
      0::NUMERIC as rh_cost, COALESCE(vgj.user_credit_cost, 0)::NUMERIC as user_credit_cost,
      COALESCE(vgj.user_credit_cost, 0)::NUMERIC as profit,
      false as waited_in_queue, 0 as queue_wait_seconds,
      CASE WHEN vgj.created_at IS NOT NULL AND vgj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (vgj.completed_at - vgj.created_at))::INTEGER ELSE 0 END as processing_seconds,
      vgj.created_at, vgj.created_at as started_at, vgj.completed_at
    FROM video_generator_jobs vgj
    WHERE vgj.user_id IS NOT NULL AND (p_start_date IS NULL OR vgj.created_at >= p_start_date) AND (p_end_date IS NULL OR vgj.created_at <= p_end_date)
  )
  SELECT aj.id, aj.tool_name, aj.user_id,
    COALESCE(p.email, 'N/A')::TEXT as user_email,
    COALESCE(p.name, '')::TEXT as user_name,
    aj.status, aj.error_message, aj.failed_at_step,
    aj.rh_cost, aj.user_credit_cost, aj.profit,
    aj.waited_in_queue, aj.queue_wait_seconds, aj.processing_seconds,
    aj.created_at, aj.started_at, aj.completed_at
  FROM all_jobs aj
  LEFT JOIN profiles p ON p.id = aj.user_id
  ORDER BY aj.created_at DESC
  OFFSET v_offset
  LIMIT p_page_size;
END;
$function$;

-- Update get_ai_tools_usage_count to include image_generator_jobs and video_generator_jobs
CREATE OR REPLACE FUNCTION public.get_ai_tools_usage_count(p_start_date timestamp with time zone DEFAULT NULL, p_end_date timestamp with time zone DEFAULT NULL)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    UNION ALL
    SELECT id FROM image_generator_jobs WHERE user_id IS NOT NULL AND (p_start_date IS NULL OR created_at >= p_start_date) AND (p_end_date IS NULL OR created_at <= p_end_date)
    UNION ALL
    SELECT id FROM video_generator_jobs WHERE user_id IS NOT NULL AND (p_start_date IS NULL OR created_at >= p_start_date) AND (p_end_date IS NULL OR created_at <= p_end_date)
  ) AS all_jobs;
  RETURN total_count;
END;
$function$;

-- Update get_ai_tools_usage_summary to include image_generator_jobs and video_generator_jobs
CREATE OR REPLACE FUNCTION public.get_ai_tools_usage_summary(p_start_date timestamp with time zone DEFAULT NULL, p_end_date timestamp with time zone DEFAULT NULL)
 RETURNS TABLE(total_jobs bigint, completed_jobs bigint, failed_jobs bigint, total_rh_cost numeric, total_user_credits numeric, total_profit numeric, jobs_with_queue bigint, avg_queue_wait_seconds numeric, avg_processing_seconds numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    UNION ALL
    SELECT igj.status, 0 as rh_cost, COALESCE(igj.user_credit_cost, 0) as user_credit_cost,
      false as waited_in_queue, 0 as queue_wait_seconds,
      CASE WHEN igj.created_at IS NOT NULL AND igj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (igj.completed_at - igj.created_at))::INTEGER ELSE 0 END
    FROM image_generator_jobs igj WHERE igj.user_id IS NOT NULL AND (p_start_date IS NULL OR igj.created_at >= p_start_date) AND (p_end_date IS NULL OR igj.created_at <= p_end_date)
    UNION ALL
    SELECT vgj.status, 0 as rh_cost, COALESCE(vgj.user_credit_cost, 0) as user_credit_cost,
      false as waited_in_queue, 0 as queue_wait_seconds,
      CASE WHEN vgj.created_at IS NOT NULL AND vgj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (vgj.completed_at - vgj.created_at))::INTEGER ELSE 0 END
    FROM video_generator_jobs vgj WHERE vgj.user_id IS NOT NULL AND (p_start_date IS NULL OR vgj.created_at >= p_start_date) AND (p_end_date IS NULL OR vgj.created_at <= p_end_date)
  )
  SELECT
    COUNT(*)::BIGINT as total_jobs,
    COUNT(*) FILTER (WHERE aj.status = 'completed')::BIGINT as completed_jobs,
    COUNT(*) FILTER (WHERE aj.status = 'failed')::BIGINT as failed_jobs,
    COALESCE(SUM(aj.rh_cost)::NUMERIC, 0) as total_rh_cost,
    COALESCE(SUM(aj.user_credit_cost)::NUMERIC, 0) as total_user_credits,
    COALESCE(SUM(aj.user_credit_cost - aj.rh_cost)::NUMERIC, 0) as total_profit,
    COUNT(*) FILTER (WHERE aj.waited_in_queue = true)::BIGINT as jobs_with_queue,
    COALESCE(ROUND(AVG(aj.queue_wait_seconds) FILTER (WHERE aj.waited_in_queue = true)::NUMERIC, 1), 0) as avg_queue_wait_seconds,
    COALESCE(ROUND(AVG(aj.processing_seconds) FILTER (WHERE aj.status = 'completed')::NUMERIC, 1), 0) as avg_processing_seconds
  FROM all_jobs aj;
END;
$function$;

-- Also update the filter-based overload of get_ai_tools_usage
CREATE OR REPLACE FUNCTION public.get_ai_tools_usage(p_start_date timestamp with time zone DEFAULT NULL, p_end_date timestamp with time zone DEFAULT NULL, p_tool_filter text DEFAULT NULL, p_status_filter text DEFAULT NULL, p_user_email text DEFAULT NULL)
 RETURNS TABLE(id uuid, tool_name text, user_id uuid, user_email text, status text, error_message text, failed_at_step text, rh_cost numeric, user_credit_cost numeric, profit numeric, waited_in_queue boolean, queue_wait_seconds integer, processing_seconds integer, created_at timestamp with time zone, started_at timestamp with time zone, completed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
    UNION ALL
    SELECT igj.id, 'Gerar Imagem'::TEXT, igj.user_id, igj.status, igj.error_message, NULL::TEXT,
      0::NUMERIC, COALESCE(igj.user_credit_cost, 0)::NUMERIC,
      COALESCE(igj.user_credit_cost, 0)::NUMERIC,
      false, 0,
      CASE WHEN igj.created_at IS NOT NULL AND igj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (igj.completed_at - igj.created_at))::INTEGER ELSE 0 END,
      igj.created_at, igj.created_at, igj.completed_at
    FROM image_generator_jobs igj WHERE igj.user_id IS NOT NULL
    UNION ALL
    SELECT vgj.id, 'Gerar Vídeo'::TEXT, vgj.user_id, vgj.status, vgj.error_message, NULL::TEXT,
      0::NUMERIC, COALESCE(vgj.user_credit_cost, 0)::NUMERIC,
      COALESCE(vgj.user_credit_cost, 0)::NUMERIC,
      false, 0,
      CASE WHEN vgj.created_at IS NOT NULL AND vgj.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (vgj.completed_at - vgj.created_at))::INTEGER ELSE 0 END,
      vgj.created_at, vgj.created_at, vgj.completed_at
    FROM video_generator_jobs vgj WHERE vgj.user_id IS NOT NULL
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
