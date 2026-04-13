
-- Drop unique constraint on table_name (multiple tools can share same table)
ALTER TABLE public.ai_tool_registry DROP CONSTRAINT IF EXISTS ai_tool_registry_table_name_key;

-- Add new columns
ALTER TABLE public.ai_tool_registry
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS is_video_tool BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS input_image_column TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS output_column TEXT DEFAULT 'output_url',
  ADD COLUMN IF NOT EXISTS cost_column TEXT DEFAULT 'rh_cost',
  ADD COLUMN IF NOT EXISTS credit_column TEXT DEFAULT 'user_credit_cost',
  ADD COLUMN IF NOT EXISTS has_failed_at_step BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS has_queue_tracking BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS has_started_at BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS badge_color TEXT DEFAULT 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engine_filter_column TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS engine_filter_value TEXT DEFAULT NULL;

-- Populate metadata for all existing tools
UPDATE public.ai_tool_registry SET display_name = 'Upscaler Arcano', is_video_tool = false, input_image_column = 'input_url', cost_column = 'rh_cost', credit_column = 'user_credit_cost', has_failed_at_step = true, has_queue_tracking = true, has_started_at = true, badge_color = 'bg-purple-500/20 text-purple-400 border-purple-500/30', display_order = 1 WHERE tool_name = 'Upscaler Arcano';

UPDATE public.ai_tool_registry SET display_name = 'Pose Changer', is_video_tool = false, input_image_column = 'person_image_url', cost_column = 'rh_cost', credit_column = 'user_credit_cost', has_failed_at_step = true, has_queue_tracking = true, has_started_at = true, badge_color = 'bg-orange-500/20 text-orange-400 border-orange-500/30', display_order = 2 WHERE tool_name = 'Pose Changer';

UPDATE public.ai_tool_registry SET display_name = 'Veste AI', is_video_tool = false, input_image_column = 'person_image_url', cost_column = 'rh_cost', credit_column = 'user_credit_cost', has_failed_at_step = true, has_queue_tracking = true, has_started_at = true, badge_color = 'bg-pink-500/20 text-pink-400 border-pink-500/30', display_order = 3 WHERE tool_name = 'Veste AI';

UPDATE public.ai_tool_registry SET display_name = 'Video Upscaler', is_video_tool = true, input_image_column = NULL, cost_column = 'rh_cost', credit_column = 'user_credit_cost', has_failed_at_step = true, has_queue_tracking = true, has_started_at = true, badge_color = 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', display_order = 4 WHERE tool_name = 'Video Upscaler';

UPDATE public.ai_tool_registry SET display_name = 'Arcano Cloner', is_video_tool = false, input_image_column = 'user_image_url', cost_column = 'rh_cost', credit_column = 'user_credit_cost', has_failed_at_step = true, has_queue_tracking = true, has_started_at = true, badge_color = 'bg-blue-500/20 text-blue-400 border-blue-500/30', display_order = 5 WHERE tool_name = 'Arcano Cloner';

UPDATE public.ai_tool_registry SET display_name = 'Gerador Avatar', is_video_tool = false, input_image_column = 'front_image_url', cost_column = 'rh_cost', credit_column = 'user_credit_cost', has_failed_at_step = true, has_queue_tracking = true, has_started_at = true, badge_color = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', display_order = 6 WHERE tool_name = 'Gerador Avatar';

UPDATE public.ai_tool_registry SET display_name = 'Gerar Imagem - Flux 2', is_video_tool = false, input_image_column = NULL, cost_column = 'rh_cost', credit_column = 'user_credit_cost', has_failed_at_step = true, has_queue_tracking = true, has_started_at = true, badge_color = 'bg-amber-500/20 text-amber-400 border-amber-500/30', display_order = 7, engine_filter_column = 'engine', engine_filter_value = 'flux2_klein' WHERE tool_name = 'Gerar Imagem';

INSERT INTO public.ai_tool_registry (tool_name, table_name, media_type, storage_folder, enabled, expiry_hours, display_name, is_video_tool, input_image_column, cost_column, credit_column, has_failed_at_step, has_queue_tracking, has_started_at, badge_color, display_order, engine_filter_column, engine_filter_value)
VALUES ('Gerar Imagem - Nano Banana', 'image_generator_jobs', 'image', 'image-generator', true, 24, 'Gerar Imagem - Nano Banana', false, NULL, 'rh_cost', 'user_credit_cost', true, true, true, 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', 8, 'engine', 'nano_banana');

UPDATE public.ai_tool_registry SET display_name = 'Gerar Vídeo', is_video_tool = true, input_image_column = NULL, cost_column = 'rh_cost', credit_column = 'user_credit_cost', has_failed_at_step = false, has_queue_tracking = false, has_started_at = false, badge_color = 'bg-rose-500/20 text-rose-400 border-rose-500/30', display_order = 9 WHERE tool_name = 'Gerar Vídeo';

UPDATE public.ai_tool_registry SET display_name = 'Flyer Maker', is_video_tool = false, input_image_column = 'reference_image_url', cost_column = 'rh_cost', credit_column = 'user_credit_cost', has_failed_at_step = true, has_queue_tracking = true, has_started_at = true, badge_color = 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', display_order = 10 WHERE tool_name = 'Flyer Maker';

UPDATE public.ai_tool_registry SET display_name = 'Remover Fundo', is_video_tool = false, input_image_column = 'input_url', cost_column = 'rh_cost', credit_column = 'user_credit_cost', has_failed_at_step = true, has_queue_tracking = true, has_started_at = true, badge_color = 'bg-teal-500/20 text-teal-400 border-teal-500/30', display_order = 11 WHERE tool_name = 'Remover Fundo';

UPDATE public.ai_tool_registry SET display_name = 'MovieLed Maker', is_video_tool = true, input_image_column = NULL, cost_column = 'rh_cost', credit_column = 'user_credit_cost', has_failed_at_step = true, has_queue_tracking = true, has_started_at = true, badge_color = 'bg-violet-500/20 text-violet-400 border-violet-500/30', display_order = 12 WHERE tool_name = 'MovieLed Maker';

UPDATE public.ai_tool_registry SET display_name = 'Seedance 2.0', is_video_tool = true, input_image_column = NULL, cost_column = NULL, credit_column = 'credits_charged', has_failed_at_step = false, has_queue_tracking = false, has_started_at = false, badge_color = 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30', display_order = 13 WHERE tool_name = 'Seedance 2.0';

-- RLS policies
DROP POLICY IF EXISTS "Admins can manage tool registry" ON public.ai_tool_registry;
DROP POLICY IF EXISTS "Authenticated users can read tool registry" ON public.ai_tool_registry;
DROP POLICY IF EXISTS "Admin full access" ON public.ai_tool_registry;
DROP POLICY IF EXISTS "Anyone can read registry" ON public.ai_tool_registry;

CREATE POLICY "Admins can manage tool registry" ON public.ai_tool_registry FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can read tool registry" ON public.ai_tool_registry FOR SELECT USING (auth.uid() IS NOT NULL);

-- =====================================================
-- RPC get_ai_tools_usage_v2
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_ai_tools_usage_v2(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20,
  p_tool_filter TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID, tool_name TEXT, user_id UUID, user_email TEXT, user_name TEXT,
  status TEXT, error_message TEXT, failed_at_step TEXT,
  rh_cost NUMERIC, user_credit_cost NUMERIC, profit NUMERIC,
  waited_in_queue BOOLEAN, queue_wait_seconds INTEGER, processing_seconds INTEGER,
  created_at TIMESTAMPTZ, started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_offset INTEGER;
  v_sql TEXT := '';
  v_tool RECORD;
  v_first BOOLEAN := true;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  v_offset := (p_page - 1) * p_page_size;

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
  END LOOP;

  IF v_sql = '' THEN RETURN; END IF;

  v_sql := 'SELECT aj.id, aj.tool_name, aj.user_id, COALESCE(p.email, ''N/A'')::TEXT as user_email, COALESCE(p.name, '''')::TEXT as user_name, aj.status, aj.error_message, aj.failed_at_step, aj.rh_cost, aj.user_credit_cost, aj.profit, aj.waited_in_queue, aj.queue_wait_seconds, aj.processing_seconds, aj.created_at, aj.started_at, aj.completed_at FROM (' || v_sql || ') aj LEFT JOIN profiles p ON p.id = aj.user_id ORDER BY aj.created_at DESC OFFSET ' || v_offset || ' LIMIT ' || p_page_size;

  RETURN QUERY EXECUTE v_sql;
END;
$$;

-- =====================================================
-- RPC get_ai_tools_usage_count_v2
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_ai_tools_usage_count_v2(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_tool_filter TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_sql TEXT := '';
  v_tool RECORD;
  v_first BOOLEAN := true;
  v_count BIGINT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
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
  END LOOP;

  IF v_sql = '' THEN RETURN 0; END IF;
  EXECUTE 'SELECT COUNT(*) FROM (' || v_sql || ') sub' INTO v_count;
  RETURN v_count;
END;
$$;

-- =====================================================
-- RPC get_ai_tools_usage_summary_v2
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_ai_tools_usage_summary_v2(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_tool_filter TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_jobs BIGINT, completed_jobs BIGINT, failed_jobs BIGINT,
  total_rh_cost NUMERIC, total_credits NUMERIC, total_profit NUMERIC,
  queued_jobs BIGINT, avg_queue_wait NUMERIC, avg_processing_seconds NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_sql TEXT := '';
  v_tool RECORD;
  v_first BOOLEAN := true;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
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
$$;
