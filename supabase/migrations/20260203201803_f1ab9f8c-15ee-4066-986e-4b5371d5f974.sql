-- Add metrics columns to upscaler_jobs
ALTER TABLE public.upscaler_jobs
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS rh_cost INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS user_credit_cost INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS waited_in_queue BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS queue_wait_seconds INTEGER DEFAULT 0;

-- Add metrics columns to pose_changer_jobs
ALTER TABLE public.pose_changer_jobs
ADD COLUMN IF NOT EXISTS rh_cost INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS user_credit_cost INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS waited_in_queue BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS queue_wait_seconds INTEGER DEFAULT 0;

-- Add metrics columns to veste_ai_jobs
ALTER TABLE public.veste_ai_jobs
ADD COLUMN IF NOT EXISTS rh_cost INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS user_credit_cost INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS waited_in_queue BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS queue_wait_seconds INTEGER DEFAULT 0;

-- Create index for querying by date and user
CREATE INDEX IF NOT EXISTS idx_upscaler_jobs_created_user ON public.upscaler_jobs(created_at DESC, user_id);
CREATE INDEX IF NOT EXISTS idx_pose_changer_jobs_created_user ON public.pose_changer_jobs(created_at DESC, user_id);
CREATE INDEX IF NOT EXISTS idx_veste_ai_jobs_created_user ON public.veste_ai_jobs(created_at DESC, user_id);

-- Create RPC function to get all AI tool usage with user info
CREATE OR REPLACE FUNCTION public.get_ai_tools_usage(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  tool_name TEXT,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  status TEXT,
  rh_cost INTEGER,
  user_credit_cost INTEGER,
  profit INTEGER,
  waited_in_queue BOOLEAN,
  queue_wait_seconds INTEGER,
  processing_seconds INTEGER,
  created_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_offset INTEGER;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  RETURN QUERY
  WITH all_jobs AS (
    -- Upscaler jobs
    SELECT 
      uj.id,
      'Upscaler Arcano'::TEXT as tool_name,
      uj.user_id,
      uj.status,
      COALESCE(uj.rh_cost, 0) as rh_cost,
      COALESCE(uj.user_credit_cost, 0) as user_credit_cost,
      COALESCE(uj.user_credit_cost, 0) - COALESCE(uj.rh_cost, 0) as profit,
      COALESCE(uj.waited_in_queue, false) as waited_in_queue,
      COALESCE(uj.queue_wait_seconds, 0) as queue_wait_seconds,
      CASE 
        WHEN uj.started_at IS NOT NULL AND uj.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (uj.completed_at - uj.started_at))::INTEGER
        ELSE 0
      END as processing_seconds,
      uj.created_at,
      uj.started_at,
      uj.completed_at
    FROM upscaler_jobs uj
    WHERE uj.user_id IS NOT NULL
    
    UNION ALL
    
    -- Pose Changer jobs
    SELECT 
      pcj.id,
      'Pose Changer'::TEXT as tool_name,
      pcj.user_id,
      pcj.status,
      COALESCE(pcj.rh_cost, 0) as rh_cost,
      COALESCE(pcj.user_credit_cost, 0) as user_credit_cost,
      COALESCE(pcj.user_credit_cost, 0) - COALESCE(pcj.rh_cost, 0) as profit,
      COALESCE(pcj.waited_in_queue, false) as waited_in_queue,
      COALESCE(pcj.queue_wait_seconds, 0) as queue_wait_seconds,
      CASE 
        WHEN pcj.started_at IS NOT NULL AND pcj.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (pcj.completed_at - pcj.started_at))::INTEGER
        ELSE 0
      END as processing_seconds,
      pcj.created_at,
      pcj.started_at,
      pcj.completed_at
    FROM pose_changer_jobs pcj
    WHERE pcj.user_id IS NOT NULL
    
    UNION ALL
    
    -- Veste AI jobs
    SELECT 
      vaj.id,
      'Veste AI'::TEXT as tool_name,
      vaj.user_id,
      vaj.status,
      COALESCE(vaj.rh_cost, 0) as rh_cost,
      COALESCE(vaj.user_credit_cost, 0) as user_credit_cost,
      COALESCE(vaj.user_credit_cost, 0) - COALESCE(vaj.rh_cost, 0) as profit,
      COALESCE(vaj.waited_in_queue, false) as waited_in_queue,
      COALESCE(vaj.queue_wait_seconds, 0) as queue_wait_seconds,
      CASE 
        WHEN vaj.started_at IS NOT NULL AND vaj.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (vaj.completed_at - vaj.started_at))::INTEGER
        ELSE 0
      END as processing_seconds,
      vaj.created_at,
      vaj.started_at,
      vaj.completed_at
    FROM veste_ai_jobs vaj
    WHERE vaj.user_id IS NOT NULL
  )
  SELECT 
    aj.id,
    aj.tool_name,
    aj.user_id,
    COALESCE(p.email, '') as user_email,
    COALESCE(p.name, '') as user_name,
    aj.status,
    aj.rh_cost,
    aj.user_credit_cost,
    aj.profit,
    aj.waited_in_queue,
    aj.queue_wait_seconds,
    aj.processing_seconds,
    aj.created_at,
    aj.started_at,
    aj.completed_at
  FROM all_jobs aj
  LEFT JOIN profiles p ON p.id = aj.user_id
  WHERE 
    (p_start_date IS NULL OR aj.created_at >= p_start_date)
    AND (p_end_date IS NULL OR aj.created_at <= p_end_date)
  ORDER BY aj.created_at DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$function$;

-- Create RPC function to get usage count for pagination
CREATE OR REPLACE FUNCTION public.get_ai_tools_usage_count(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM (
    SELECT id FROM upscaler_jobs 
    WHERE user_id IS NOT NULL 
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
    UNION ALL
    SELECT id FROM pose_changer_jobs 
    WHERE user_id IS NOT NULL
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
    UNION ALL
    SELECT id FROM veste_ai_jobs 
    WHERE user_id IS NOT NULL
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
  ) combined;
  
  RETURN v_count;
END;
$function$;

-- Create RPC function to get usage summary stats
CREATE OR REPLACE FUNCTION public.get_ai_tools_usage_summary(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE(
  total_jobs INTEGER,
  completed_jobs INTEGER,
  failed_jobs INTEGER,
  total_rh_cost INTEGER,
  total_user_credits INTEGER,
  total_profit INTEGER,
  jobs_with_queue INTEGER,
  avg_queue_wait_seconds NUMERIC,
  avg_processing_seconds NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH all_jobs AS (
    SELECT 
      uj.status,
      COALESCE(uj.rh_cost, 0) as rh_cost,
      COALESCE(uj.user_credit_cost, 0) as user_credit_cost,
      COALESCE(uj.waited_in_queue, false) as waited_in_queue,
      COALESCE(uj.queue_wait_seconds, 0) as queue_wait_seconds,
      CASE 
        WHEN uj.started_at IS NOT NULL AND uj.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (uj.completed_at - uj.started_at))::INTEGER
        ELSE 0
      END as processing_seconds
    FROM upscaler_jobs uj
    WHERE uj.user_id IS NOT NULL
      AND (p_start_date IS NULL OR uj.created_at >= p_start_date)
      AND (p_end_date IS NULL OR uj.created_at <= p_end_date)
    
    UNION ALL
    
    SELECT 
      pcj.status,
      COALESCE(pcj.rh_cost, 0),
      COALESCE(pcj.user_credit_cost, 0),
      COALESCE(pcj.waited_in_queue, false),
      COALESCE(pcj.queue_wait_seconds, 0),
      CASE 
        WHEN pcj.started_at IS NOT NULL AND pcj.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (pcj.completed_at - pcj.started_at))::INTEGER
        ELSE 0
      END
    FROM pose_changer_jobs pcj
    WHERE pcj.user_id IS NOT NULL
      AND (p_start_date IS NULL OR pcj.created_at >= p_start_date)
      AND (p_end_date IS NULL OR pcj.created_at <= p_end_date)
    
    UNION ALL
    
    SELECT 
      vaj.status,
      COALESCE(vaj.rh_cost, 0),
      COALESCE(vaj.user_credit_cost, 0),
      COALESCE(vaj.waited_in_queue, false),
      COALESCE(vaj.queue_wait_seconds, 0),
      CASE 
        WHEN vaj.started_at IS NOT NULL AND vaj.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (vaj.completed_at - vaj.started_at))::INTEGER
        ELSE 0
      END
    FROM veste_ai_jobs vaj
    WHERE vaj.user_id IS NOT NULL
      AND (p_start_date IS NULL OR vaj.created_at >= p_start_date)
      AND (p_end_date IS NULL OR vaj.created_at <= p_end_date)
  )
  SELECT 
    COUNT(*)::INTEGER as total_jobs,
    COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as completed_jobs,
    COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as failed_jobs,
    COALESCE(SUM(rh_cost), 0)::INTEGER as total_rh_cost,
    COALESCE(SUM(user_credit_cost), 0)::INTEGER as total_user_credits,
    COALESCE(SUM(user_credit_cost) - SUM(rh_cost), 0)::INTEGER as total_profit,
    COUNT(*) FILTER (WHERE waited_in_queue = true)::INTEGER as jobs_with_queue,
    COALESCE(AVG(queue_wait_seconds) FILTER (WHERE waited_in_queue = true), 0) as avg_queue_wait_seconds,
    COALESCE(AVG(processing_seconds) FILTER (WHERE status = 'completed'), 0) as avg_processing_seconds
  FROM all_jobs;
END;
$function$;