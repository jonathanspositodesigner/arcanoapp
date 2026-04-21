CREATE OR REPLACE FUNCTION public.get_user_ai_creations(
  p_media_type TEXT DEFAULT 'all',
  p_offset INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 24
)
RETURNS TABLE(
  id UUID,
  output_url TEXT,
  thumbnail_url TEXT,
  tool_name TEXT,
  media_type TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_cutoff TIMESTAMPTZ := '2026-02-12T00:00:00Z';
  v_sql TEXT := '';
  v_tool RECORD;
  v_first BOOLEAN := TRUE;
BEGIN
  FOR v_tool IN
    SELECT r.table_name, r.tool_name, r.media_type, r.expiry_hours,
           r.engine_filter_column, r.engine_filter_value
    FROM ai_tool_registry r
    WHERE r.enabled = true
      AND (p_media_type = 'all' OR r.media_type = p_media_type)
  LOOP
    IF NOT v_first THEN
      v_sql := v_sql || ' UNION ALL ';
    END IF;
    v_first := FALSE;

    -- Base query
    v_sql := v_sql || format(
      'SELECT t.id, t.output_url, t.thumbnail_url, %L::TEXT AS tool_name, %L::TEXT AS media_type, t.created_at,
        CASE WHEN t.created_at >= %L::timestamptz THEN (t.completed_at + interval ''24 hours'') ELSE (t.completed_at + interval ''5 days'') END AS expires_at
       FROM %I t
       WHERE t.user_id = %L AND t.status = ''completed'' AND t.output_url IS NOT NULL
         AND CASE WHEN t.created_at >= %L::timestamptz THEN (t.completed_at + interval ''24 hours'') > now() ELSE (t.completed_at + interval ''5 days'') > now() END',
      v_tool.tool_name, v_tool.media_type, v_cutoff, v_tool.table_name, v_user_id, v_cutoff
    );

    -- Apply engine filter if registry entry has one (prevents duplicates from same table)
    IF v_tool.engine_filter_column IS NOT NULL AND v_tool.engine_filter_value IS NOT NULL THEN
      v_sql := v_sql || format(
        ' AND t.%I = %L',
        v_tool.engine_filter_column, v_tool.engine_filter_value
      );
    END IF;

  END LOOP;

  IF v_sql = '' THEN
    RETURN;
  END IF;

  v_sql := 'SELECT * FROM (' || v_sql || ') sub ORDER BY sub.created_at DESC LIMIT ' || p_limit || ' OFFSET ' || p_offset;

  RETURN QUERY EXECUTE v_sql;
END;
$function$;