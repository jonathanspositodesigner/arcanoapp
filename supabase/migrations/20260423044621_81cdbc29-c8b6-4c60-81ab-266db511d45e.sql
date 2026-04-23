
CREATE OR REPLACE FUNCTION public.admin_reconcile_tool_earnings(
  _limit integer DEFAULT 200,
  _offset integer DEFAULT 0,
  _filter_status text DEFAULT 'all'
)
RETURNS TABLE(
  tool_table text,
  tool_display_name text,
  job_id uuid,
  prompt_id text,
  user_id uuid,
  completed_at timestamptz,
  earning_registered boolean,
  amount_paid numeric,
  active_rate numeric,
  rate_match boolean,
  partner_name text,
  reconciliation_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'
  ) INTO _is_admin;
  
  IF NOT _is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH all_ref_jobs AS (
    -- Arcano Cloner
    SELECT 'arcano_cloner_jobs'::text AS _tool_table,
           j.id AS _job_id,
           j.reference_prompt_id AS _prompt_id,
           j.user_id AS _user_id,
           j.completed_at AS _completed_at
    FROM arcano_cloner_jobs j
    WHERE j.status = 'completed' AND j.reference_prompt_id IS NOT NULL
    
    UNION ALL
    
    -- Pose Changer
    SELECT 'pose_changer_jobs'::text,
           j.id, j.reference_prompt_id, j.user_id, j.completed_at
    FROM pose_changer_jobs j
    WHERE j.status = 'completed' AND j.reference_prompt_id IS NOT NULL
    
    UNION ALL
    
    -- Veste AI
    SELECT 'veste_ai_jobs'::text,
           j.id, j.reference_prompt_id, j.user_id, j.completed_at
    FROM veste_ai_jobs j
    WHERE j.status = 'completed' AND j.reference_prompt_id IS NOT NULL
    
    UNION ALL
    
    -- Seedance
    SELECT 'seedance_jobs'::text,
           j.id, j.reference_prompt_id, j.user_id, j.completed_at
    FROM seedance_jobs j
    WHERE j.status = 'completed' AND j.reference_prompt_id IS NOT NULL
    
    UNION ALL
    
    -- MovieLED
    SELECT 'movieled_maker_jobs'::text,
           j.id, j.reference_prompt_id, j.user_id, j.completed_at
    FROM movieled_maker_jobs j
    WHERE j.status = 'completed' AND j.reference_prompt_id IS NOT NULL
  ),
  reconciled AS (
    SELECT
      arj._tool_table,
      COALESCE(ctr.tool_display_name, arj._tool_table) AS _tool_display_name,
      arj._job_id,
      arj._prompt_id,
      arj._user_id,
      arj._completed_at,
      (cte.id IS NOT NULL) AS _earning_registered,
      COALESCE(cte.amount, 0)::numeric AS _amount_paid,
      COALESCE(ctr.earning_per_use, 0)::numeric AS _active_rate,
      CASE
        WHEN cte.id IS NULL THEN false
        WHEN cte.amount = ctr.earning_per_use THEN true
        ELSE false
      END AS _rate_match,
      COALESCE(p.name, 'N/A') AS _partner_name,
      CASE
        WHEN cte.id IS NULL THEN 'missing'
        WHEN cte.amount = ctr.earning_per_use THEN 'ok'
        ELSE 'mismatch'
      END AS _reconciliation_status
    FROM all_ref_jobs arj
    LEFT JOIN collaborator_tool_earnings cte 
      ON cte.job_id = arj._job_id::text AND cte.tool_table = arj._tool_table
    LEFT JOIN collaborator_tool_rates ctr 
      ON ctr.tool_table = arj._tool_table
    LEFT JOIN partners p 
      ON p.id = cte.collaborator_id
  )
  SELECT
    r._tool_table,
    r._tool_display_name,
    r._job_id,
    r._prompt_id,
    r._user_id,
    r._completed_at,
    r._earning_registered,
    r._amount_paid,
    r._active_rate,
    r._rate_match,
    r._partner_name,
    r._reconciliation_status
  FROM reconciled r
  WHERE _filter_status = 'all' OR r._reconciliation_status = _filter_status
  ORDER BY r._completed_at DESC NULLS LAST
  LIMIT _limit OFFSET _offset;
END;
$$;
