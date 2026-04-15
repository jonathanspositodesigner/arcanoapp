
CREATE OR REPLACE FUNCTION public.get_ai_tools_completed_by_tool(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_tool_filter text DEFAULT NULL,
  p_status_filter text DEFAULT NULL
)
RETURNS TABLE(tool_name text, completed_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.tool_name,
    COUNT(*) FILTER (WHERE r.status = 'completed') as completed_count
  FROM ai_tool_registry reg
  CROSS JOIN LATERAL (
    SELECT t.status, reg.tool_name as tool_name
    FROM LATERAL (
      SELECT status, created_at
      FROM arcano_cloner_jobs WHERE reg.table_name = 'arcano_cloner_jobs'
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
        AND (p_status_filter IS NULL OR status = p_status_filter)
      UNION ALL
      SELECT status, created_at
      FROM character_generator_jobs WHERE reg.table_name = 'character_generator_jobs'
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
        AND (p_status_filter IS NULL OR status = p_status_filter)
      UNION ALL
      SELECT status, created_at
      FROM flyer_maker_jobs WHERE reg.table_name = 'flyer_maker_jobs'
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
        AND (p_status_filter IS NULL OR status = p_status_filter)
      UNION ALL
      SELECT status, created_at
      FROM bg_remover_jobs WHERE reg.table_name = 'bg_remover_jobs'
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
        AND (p_status_filter IS NULL OR status = p_status_filter)
      UNION ALL
      SELECT status, created_at
      FROM image_generator_jobs WHERE reg.table_name = 'image_generator_jobs'
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
        AND (p_status_filter IS NULL OR status = p_status_filter)
      UNION ALL
      SELECT status, created_at
      FROM video_generator_jobs WHERE reg.table_name = 'video_generator_jobs'
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
        AND (p_status_filter IS NULL OR status = p_status_filter)
      UNION ALL
      SELECT status, created_at
      FROM upscaler_jobs WHERE reg.table_name = 'upscaler_jobs'
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
        AND (p_status_filter IS NULL OR status = p_status_filter)
      UNION ALL
      SELECT status, created_at
      FROM seedance_jobs WHERE reg.table_name = 'seedance_jobs'
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
        AND (p_status_filter IS NULL OR status = p_status_filter)
      UNION ALL
      SELECT status, created_at
      FROM movie_led_jobs WHERE reg.table_name = 'movie_led_jobs'
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
        AND (p_status_filter IS NULL OR status = p_status_filter)
    ) t
  ) r
  WHERE reg.enabled = true
    AND (p_tool_filter IS NULL OR reg.tool_name = p_tool_filter)
  GROUP BY r.tool_name;
END;
$$;
