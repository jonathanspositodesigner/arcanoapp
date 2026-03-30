
DROP FUNCTION IF EXISTS public.cleanup_expired_ai_jobs();

CREATE OR REPLACE FUNCTION public.cleanup_expired_ai_jobs()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cutoff TIMESTAMPTZ := '2026-02-12T00:00:00Z';
  v_tool RECORD;
  v_count INTEGER;
  v_report JSONB := '{}'::JSONB;
BEGIN
  FOR v_tool IN
    SELECT r.table_name, r.tool_name FROM ai_tool_registry r WHERE r.enabled = true
  LOOP
    EXECUTE format(
      'WITH deleted AS (
        DELETE FROM %I WHERE status = ''completed'' AND completed_at IS NOT NULL
          AND CASE WHEN created_at >= $1 THEN (completed_at + interval ''24 hours'') < now() ELSE (completed_at + interval ''5 days'') < now() END
        RETURNING id
      ) SELECT COUNT(*) FROM deleted',
      v_tool.table_name
    ) INTO v_count USING v_cutoff;

    v_report := v_report || jsonb_build_object(v_tool.tool_name, v_count);
  END LOOP;

  RETURN v_report;
END;
$function$;
