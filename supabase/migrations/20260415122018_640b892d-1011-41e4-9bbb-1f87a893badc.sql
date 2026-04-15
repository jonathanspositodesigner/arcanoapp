CREATE OR REPLACE FUNCTION public.get_ai_tools_completed_by_tool(
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_tool_filter text DEFAULT NULL::text,
  p_status_filter text DEFAULT NULL::text
)
RETURNS TABLE(tool_name text, completed_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sql TEXT := '';
  v_tool RECORD;
  v_first BOOLEAN := true;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  FOR v_tool IN
    SELECT
      t.display_name AS dn,
      t.table_name AS tn,
      t.engine_filter_column AS efc,
      t.engine_filter_value AS efv
    FROM public.ai_tool_registry t
    WHERE t.enabled = true
      AND (
        p_tool_filter IS NULL
        OR p_tool_filter = ''
        OR p_tool_filter = 'all'
        OR t.display_name = p_tool_filter
      )
    ORDER BY t.display_order
  LOOP
    IF NOT v_first THEN
      v_sql := v_sql || ' UNION ALL ';
    END IF;
    v_first := false;

    v_sql := v_sql
      || 'SELECT '
      || quote_literal(v_tool.dn) || '::TEXT AS tool_name, '
      || 'j.status '
      || 'FROM ' || quote_ident(v_tool.tn) || ' j '
      || 'WHERE j.user_id IS NOT NULL';

    IF p_start_date IS NOT NULL THEN
      v_sql := v_sql || ' AND j.created_at >= ' || quote_literal(p_start_date);
    END IF;

    IF p_end_date IS NOT NULL THEN
      v_sql := v_sql || ' AND j.created_at <= ' || quote_literal(p_end_date);
    END IF;

    IF p_status_filter IS NOT NULL AND p_status_filter <> '' AND p_status_filter <> 'all' THEN
      v_sql := v_sql || ' AND j.status = ' || quote_literal(p_status_filter);
    END IF;

    IF v_tool.efc IS NOT NULL AND v_tool.efv IS NOT NULL THEN
      v_sql := v_sql || ' AND j.' || quote_ident(v_tool.efc) || ' = ' || quote_literal(v_tool.efv);
    END IF;
  END LOOP;

  IF v_sql = '' THEN
    RETURN;
  END IF;

  RETURN QUERY EXECUTE
    'SELECT sub.tool_name, COUNT(*) FILTER (WHERE sub.status = ''completed'')::BIGINT AS completed_count '
    || 'FROM (' || v_sql || ') sub '
    || 'GROUP BY sub.tool_name '
    || 'ORDER BY sub.tool_name';
END;
$function$;