DROP FUNCTION IF EXISTS public.get_ai_tools_usage_count_v2(timestamp with time zone, timestamp with time zone, text, text);
DROP FUNCTION IF EXISTS public.get_ai_tools_usage_summary_v2(timestamp with time zone, timestamp with time zone, text, text);
DROP FUNCTION IF EXISTS public.get_ai_tools_completed_by_tool(timestamp with time zone, timestamp with time zone, text, text);
DROP FUNCTION IF EXISTS public.get_ai_tools_usage_v2(timestamp with time zone, timestamp with time zone, integer, integer, text, text);