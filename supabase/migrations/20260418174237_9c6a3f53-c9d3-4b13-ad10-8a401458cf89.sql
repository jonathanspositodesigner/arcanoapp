
-- get_ai_tools_usage_v2 with optional search term
CREATE OR REPLACE FUNCTION public.get_ai_tools_usage_v2(
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20,
  p_tool_filter text DEFAULT NULL,
  p_status_filter text DEFAULT NULL,
  p_search_term text DEFAULT NULL
)
RETURNS TABLE(id uuid, tool_name text, user_id uuid, user_email text, user_name text, status text, error_message text, failed_at_step text, rh_cost numeric, user_credit_cost numeric, profit numeric, waited_in_queue boolean, queue_wait_seconds integer, processing_seconds integer, created_at timestamp with time zone, started_at timestamp with time zone, completed_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_offset INTEGER;
  v_sql TEXT := '';
  v_tool RECORD;
  v_first BOOLEAN := true;
  v_user_filter TEXT := '';
  v_search TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  v_offset := (p_page - 1) * p_page_size;

  IF p_search_term IS NOT NULL AND btrim(p_search_term) <> '' THEN
    v_search := '%' || btrim(p_search_term) || '%';
    v_user_filter := ' AND j.user_id IN (SELECT id FROM public.profiles WHERE email ILIKE ' || quote_literal(v_search) || ' OR name ILIKE ' || quote_literal(v_search) || ')';
  END IF;

  FOR v_tool IN
    SELECT t.display_name AS dn, t.table_name AS tn, t.cost_column AS cc,
           t.credit_column AS crc, t.has_failed_at_step AS hfs,
           t.has_queue_tracking AS hqt, t.has_started_at AS hsa,
           t.engine_filter_column AS efc, t.engine_filter_value AS efv
    FROM ai_tool_registry t
    WHERE t.enabled = true
      AND (p_tool_filter IS NULL OR p_tool_filter = '' OR p_tool_filter = 'all' OR t.display_name = p_tool_filter)
    ORDER BY t.display_order
  LOOP
    IF NOT v_first THEN v_sql := v_sql || ' UNION ALL '; END IF;
    v_first := false;

    v_sql := v_sql || 'SELECT j.id, ' || quote_literal(v_tool.dn) || '::TEXT as tool_name, j.user_id, j.status, j.error_message, ';
    IF v_tool.hfs THEN v_sql := v_sql || 'j.failed_at_step, '; ELSE v_sql := v_sql || 'NULL::TEXT as failed_at_step, '; END IF;
    IF v_tool.cc IS NOT NULL THEN v_sql := v_sql || 'COALESCE(j.' || quote_ident(v_tool.cc) || ', 0)::NUMERIC as rh_cost, '; ELSE v_sql := v_sql || '0::NUMERIC as rh_cost, '; END IF;
    v_sql := v_sql || 'COALESCE(j.' || quote_ident(v_tool.crc) || ', 0)::NUMERIC as user_credit_cost, ';
    IF v_tool.cc IS NOT NULL THEN v_sql := v_sql || '(COALESCE(j.' || quote_ident(v_tool.crc) || ', 0) - COALESCE(j.' || quote_ident(v_tool.cc) || ', 0))::NUMERIC as profit, '; ELSE v_sql := v_sql || 'COALESCE(j.' || quote_ident(v_tool.crc) || ', 0)::NUMERIC as profit, '; END IF;
    IF v_tool.hqt THEN v_sql := v_sql || 'COALESCE(j.waited_in_queue, false) as waited_in_queue, COALESCE(j.queue_wait_seconds, 0)::INTEGER as queue_wait_seconds, '; ELSE v_sql := v_sql || 'false as waited_in_queue, 0::INTEGER as queue_wait_seconds, '; END IF;
    IF v_tool.hsa THEN v_sql := v_sql || 'CASE WHEN j.started_at IS NOT NULL AND j.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (j.completed_at - j.started_at))::INTEGER ELSE 0 END as processing_seconds, j.created_at, j.started_at, j.completed_at '; ELSE v_sql := v_sql || 'CASE WHEN j.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (j.completed_at - j.created_at))::INTEGER ELSE 0 END as processing_seconds, j.created_at, j.created_at as started_at, j.completed_at '; END IF;
    v_sql := v_sql || 'FROM ' || quote_ident(v_tool.tn) || ' j WHERE j.user_id IS NOT NULL';
    IF p_start_date IS NOT NULL THEN v_sql := v_sql || ' AND j.created_at >= ' || quote_literal(p_start_date); END IF;
    IF p_end_date IS NOT NULL THEN v_sql := v_sql || ' AND j.created_at <= ' || quote_literal(p_end_date); END IF;
    IF p_status_filter IS NOT NULL AND p_status_filter != '' AND p_status_filter != 'all' THEN v_sql := v_sql || ' AND j.status = ' || quote_literal(p_status_filter); END IF;
    IF v_tool.efc IS NOT NULL AND v_tool.efv IS NOT NULL THEN v_sql := v_sql || ' AND j.' || quote_ident(v_tool.efc) || ' = ' || quote_literal(v_tool.efv); END IF;
    v_sql := v_sql || v_user_filter;
  END LOOP;

  IF v_sql = '' THEN RETURN; END IF;

  v_sql := 'SELECT aj.id, aj.tool_name, aj.user_id, COALESCE(p.email, ''N/A'')::TEXT as user_email, COALESCE(p.name, '''')::TEXT as user_name, aj.status, aj.error_message, aj.failed_at_step, aj.rh_cost, aj.user_credit_cost, aj.profit, aj.waited_in_queue, aj.queue_wait_seconds, aj.processing_seconds, aj.created_at, aj.started_at, aj.completed_at FROM (' || v_sql || ') aj LEFT JOIN profiles p ON p.id = aj.user_id ORDER BY aj.created_at DESC OFFSET ' || v_offset || ' LIMIT ' || p_page_size;

  RETURN QUERY EXECUTE v_sql;
END;
$function$;

-- get_ai_tools_usage_count_v2 with optional search term
CREATE OR REPLACE FUNCTION public.get_ai_tools_usage_count_v2(
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_tool_filter text DEFAULT NULL,
  p_status_filter text DEFAULT NULL,
  p_search_term text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sql TEXT := '';
  v_tool RECORD;
  v_first BOOLEAN := true;
  v_count BIGINT;
  v_user_filter TEXT := '';
  v_search TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF p_search_term IS NOT NULL AND btrim(p_search_term) <> '' THEN
    v_search := '%' || btrim(p_search_term) || '%';
    v_user_filter := ' AND j.user_id IN (SELECT id FROM public.profiles WHERE email ILIKE ' || quote_literal(v_search) || ' OR name ILIKE ' || quote_literal(v_search) || ')';
  END IF;

  FOR v_tool IN
    SELECT t.display_name AS dn, t.table_name AS tn, t.engine_filter_column AS efc, t.engine_filter_value AS efv
    FROM ai_tool_registry t
    WHERE t.enabled = true AND (p_tool_filter IS NULL OR p_tool_filter = '' OR p_tool_filter = 'all' OR t.display_name = p_tool_filter)
    ORDER BY t.display_order
  LOOP
    IF NOT v_first THEN v_sql := v_sql || ' UNION ALL '; END IF;
    v_first := false;
    v_sql := v_sql || 'SELECT j.id FROM ' || quote_ident(v_tool.tn) || ' j WHERE j.user_id IS NOT NULL';
    IF p_start_date IS NOT NULL THEN v_sql := v_sql || ' AND j.created_at >= ' || quote_literal(p_start_date); END IF;
    IF p_end_date IS NOT NULL THEN v_sql := v_sql || ' AND j.created_at <= ' || quote_literal(p_end_date); END IF;
    IF p_status_filter IS NOT NULL AND p_status_filter != '' AND p_status_filter != 'all' THEN v_sql := v_sql || ' AND j.status = ' || quote_literal(p_status_filter); END IF;
    IF v_tool.efc IS NOT NULL AND v_tool.efv IS NOT NULL THEN v_sql := v_sql || ' AND j.' || quote_ident(v_tool.efc) || ' = ' || quote_literal(v_tool.efv); END IF;
    v_sql := v_sql || v_user_filter;
  END LOOP;

  IF v_sql = '' THEN RETURN 0; END IF;
  EXECUTE 'SELECT COUNT(*) FROM (' || v_sql || ') sub' INTO v_count;
  RETURN v_count;
END;
$function$;

-- get_ai_tools_usage_summary_v2 with optional search term
CREATE OR REPLACE FUNCTION public.get_ai_tools_usage_summary_v2(
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_tool_filter text DEFAULT NULL,
  p_status_filter text DEFAULT NULL,
  p_search_term text DEFAULT NULL
)
RETURNS TABLE(total_jobs bigint, completed_jobs bigint, failed_jobs bigint, total_rh_cost numeric, total_credits numeric, total_profit numeric, queued_jobs bigint, avg_queue_wait numeric, avg_processing_seconds numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sql TEXT := '';
  v_tool RECORD;
  v_first BOOLEAN := true;
  v_user_filter TEXT := '';
  v_search TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF p_search_term IS NOT NULL AND btrim(p_search_term) <> '' THEN
    v_search := '%' || btrim(p_search_term) || '%';
    v_user_filter := ' AND j.user_id IN (SELECT id FROM public.profiles WHERE email ILIKE ' || quote_literal(v_search) || ' OR name ILIKE ' || quote_literal(v_search) || ')';
  END IF;

  FOR v_tool IN
    SELECT t.display_name AS dn, t.table_name AS tn, t.cost_column AS cc,
           t.credit_column AS crc, t.has_queue_tracking AS hqt, t.has_started_at AS hsa,
           t.engine_filter_column AS efc, t.engine_filter_value AS efv
    FROM ai_tool_registry t
    WHERE t.enabled = true AND (p_tool_filter IS NULL OR p_tool_filter = '' OR p_tool_filter = 'all' OR t.display_name = p_tool_filter)
    ORDER BY t.display_order
  LOOP
    IF NOT v_first THEN v_sql := v_sql || ' UNION ALL '; END IF;
    v_first := false;

    v_sql := v_sql || 'SELECT j.status, ';
    IF v_tool.cc IS NOT NULL THEN v_sql := v_sql || 'COALESCE(j.' || quote_ident(v_tool.cc) || ', 0)::NUMERIC as rh_cost, '; ELSE v_sql := v_sql || '0::NUMERIC as rh_cost, '; END IF;
    v_sql := v_sql || 'COALESCE(j.' || quote_ident(v_tool.crc) || ', 0)::NUMERIC as user_credit_cost, ';
    IF v_tool.cc IS NOT NULL THEN v_sql := v_sql || '(COALESCE(j.' || quote_ident(v_tool.crc) || ', 0) - COALESCE(j.' || quote_ident(v_tool.cc) || ', 0))::NUMERIC as profit, '; ELSE v_sql := v_sql || 'COALESCE(j.' || quote_ident(v_tool.crc) || ', 0)::NUMERIC as profit, '; END IF;
    IF v_tool.hqt THEN v_sql := v_sql || 'COALESCE(j.waited_in_queue, false) as waited_in_queue, COALESCE(j.queue_wait_seconds, 0)::INTEGER as queue_wait_seconds, '; ELSE v_sql := v_sql || 'false as waited_in_queue, 0::INTEGER as queue_wait_seconds, '; END IF;
    IF v_tool.hsa THEN v_sql := v_sql || 'CASE WHEN j.started_at IS NOT NULL AND j.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (j.completed_at - j.started_at))::INTEGER ELSE 0 END as processing_seconds '; ELSE v_sql := v_sql || 'CASE WHEN j.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (j.completed_at - j.created_at))::INTEGER ELSE 0 END as processing_seconds '; END IF;
    v_sql := v_sql || 'FROM ' || quote_ident(v_tool.tn) || ' j WHERE j.user_id IS NOT NULL';
    IF p_start_date IS NOT NULL THEN v_sql := v_sql || ' AND j.created_at >= ' || quote_literal(p_start_date); END IF;
    IF p_end_date IS NOT NULL THEN v_sql := v_sql || ' AND j.created_at <= ' || quote_literal(p_end_date); END IF;
    IF p_status_filter IS NOT NULL AND p_status_filter != '' AND p_status_filter != 'all' THEN v_sql := v_sql || ' AND j.status = ' || quote_literal(p_status_filter); END IF;
    IF v_tool.efc IS NOT NULL AND v_tool.efv IS NOT NULL THEN v_sql := v_sql || ' AND j.' || quote_ident(v_tool.efc) || ' = ' || quote_literal(v_tool.efv); END IF;
    v_sql := v_sql || v_user_filter;
  END LOOP;

  IF v_sql = '' THEN
    RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::BIGINT, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  RETURN QUERY EXECUTE
    'SELECT COUNT(*)::BIGINT, '
    || 'COUNT(*) FILTER (WHERE sub.status = ''completed'')::BIGINT, '
    || 'COUNT(*) FILTER (WHERE sub.status = ''failed'')::BIGINT, '
    || 'COALESCE(SUM(CASE WHEN sub.status != ''failed'' THEN sub.rh_cost ELSE 0 END), 0)::NUMERIC, '
    || 'COALESCE(SUM(CASE WHEN sub.status != ''failed'' THEN sub.user_credit_cost ELSE 0 END), 0)::NUMERIC, '
    || 'COALESCE(SUM(CASE WHEN sub.status != ''failed'' THEN sub.profit ELSE 0 END), 0)::NUMERIC, '
    || 'COUNT(*) FILTER (WHERE sub.waited_in_queue = true)::BIGINT, '
    || 'COALESCE(AVG(CASE WHEN sub.waited_in_queue = true THEN sub.queue_wait_seconds END), 0)::NUMERIC, '
    || 'COALESCE(AVG(CASE WHEN sub.processing_seconds > 0 THEN sub.processing_seconds END), 0)::NUMERIC '
    || 'FROM (' || v_sql || ') sub';
END;
$function$;

-- get_ai_tools_completed_by_tool with optional search term
CREATE OR REPLACE FUNCTION public.get_ai_tools_completed_by_tool(
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_tool_filter text DEFAULT NULL,
  p_status_filter text DEFAULT NULL,
  p_search_term text DEFAULT NULL
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
  v_user_filter TEXT := '';
  v_search TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF p_search_term IS NOT NULL AND btrim(p_search_term) <> '' THEN
    v_search := '%' || btrim(p_search_term) || '%';
    v_user_filter := ' AND j.user_id IN (SELECT id FROM public.profiles WHERE email ILIKE ' || quote_literal(v_search) || ' OR name ILIKE ' || quote_literal(v_search) || ')';
  END IF;

  FOR v_tool IN
    SELECT t.display_name AS dn, t.table_name AS tn, t.engine_filter_column AS efc, t.engine_filter_value AS efv
    FROM public.ai_tool_registry t
    WHERE t.enabled = true
      AND (p_tool_filter IS NULL OR p_tool_filter = '' OR p_tool_filter = 'all' OR t.display_name = p_tool_filter)
    ORDER BY t.display_order
  LOOP
    IF NOT v_first THEN v_sql := v_sql || ' UNION ALL '; END IF;
    v_first := false;

    v_sql := v_sql
      || 'SELECT ' || quote_literal(v_tool.dn) || '::TEXT AS tool_name, j.status '
      || 'FROM ' || quote_ident(v_tool.tn) || ' j '
      || 'WHERE j.user_id IS NOT NULL';

    IF p_start_date IS NOT NULL THEN v_sql := v_sql || ' AND j.created_at >= ' || quote_literal(p_start_date); END IF;
    IF p_end_date IS NOT NULL THEN v_sql := v_sql || ' AND j.created_at <= ' || quote_literal(p_end_date); END IF;
    IF p_status_filter IS NOT NULL AND p_status_filter <> '' AND p_status_filter <> 'all' THEN v_sql := v_sql || ' AND j.status = ' || quote_literal(p_status_filter); END IF;
    IF v_tool.efc IS NOT NULL AND v_tool.efv IS NOT NULL THEN v_sql := v_sql || ' AND j.' || quote_ident(v_tool.efc) || ' = ' || quote_literal(v_tool.efv); END IF;
    v_sql := v_sql || v_user_filter;
  END LOOP;

  IF v_sql = '' THEN RETURN; END IF;

  RETURN QUERY EXECUTE
    'SELECT sub.tool_name, COUNT(*) FILTER (WHERE sub.status = ''completed'')::BIGINT '
    || 'FROM (' || v_sql || ') sub '
    || 'GROUP BY sub.tool_name '
    || 'ORDER BY sub.tool_name';
END;
$function$;
