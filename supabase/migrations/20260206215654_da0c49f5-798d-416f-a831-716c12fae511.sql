-- RPC: Retorna médias de custo RH e créditos por ferramenta de IA
CREATE OR REPLACE FUNCTION public.get_ai_tools_cost_averages()
RETURNS TABLE (
  tool_name TEXT,
  total_jobs BIGINT,
  avg_rh_cost NUMERIC,
  avg_credit_cost NUMERIC,
  total_rh_cost NUMERIC,
  total_credit_cost NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    -- Upscaler (normal - até 70 créditos)
    SELECT 
      'Upscaler Arcano'::TEXT as tool_name,
      COUNT(*)::BIGINT as total_jobs,
      COALESCE(ROUND(AVG(rh_cost)::NUMERIC, 2), 0) as avg_rh_cost,
      COALESCE(ROUND(AVG(user_credit_cost)::NUMERIC, 2), 0) as avg_credit_cost,
      COALESCE(SUM(rh_cost)::NUMERIC, 0) as total_rh_cost,
      COALESCE(SUM(user_credit_cost)::NUMERIC, 0) as total_credit_cost
    FROM upscaler_jobs
    WHERE status = 'completed' 
      AND user_credit_cost <= 70
    
    UNION ALL
    
    -- Upscaler Pro (acima de 70 créditos)
    SELECT 
      'Upscaler Pro'::TEXT as tool_name,
      COUNT(*)::BIGINT as total_jobs,
      COALESCE(ROUND(AVG(rh_cost)::NUMERIC, 2), 0) as avg_rh_cost,
      COALESCE(ROUND(AVG(user_credit_cost)::NUMERIC, 2), 0) as avg_credit_cost,
      COALESCE(SUM(rh_cost)::NUMERIC, 0) as total_rh_cost,
      COALESCE(SUM(user_credit_cost)::NUMERIC, 0) as total_credit_cost
    FROM upscaler_jobs
    WHERE status = 'completed' 
      AND user_credit_cost > 70
    
    UNION ALL
    
    -- Pose Changer
    SELECT 
      'Pose Changer'::TEXT as tool_name,
      COUNT(*)::BIGINT as total_jobs,
      COALESCE(ROUND(AVG(rh_cost)::NUMERIC, 2), 0) as avg_rh_cost,
      COALESCE(ROUND(AVG(user_credit_cost)::NUMERIC, 2), 0) as avg_credit_cost,
      COALESCE(SUM(rh_cost)::NUMERIC, 0) as total_rh_cost,
      COALESCE(SUM(user_credit_cost)::NUMERIC, 2) as total_credit_cost
    FROM pose_changer_jobs
    WHERE status = 'completed'
    
    UNION ALL
    
    -- Veste AI
    SELECT 
      'Veste AI'::TEXT as tool_name,
      COUNT(*)::BIGINT as total_jobs,
      COALESCE(ROUND(AVG(rh_cost)::NUMERIC, 2), 0) as avg_rh_cost,
      COALESCE(ROUND(AVG(user_credit_cost)::NUMERIC, 2), 0) as avg_credit_cost,
      COALESCE(SUM(rh_cost)::NUMERIC, 0) as total_rh_cost,
      COALESCE(SUM(user_credit_cost)::NUMERIC, 0) as total_credit_cost
    FROM veste_ai_jobs
    WHERE status = 'completed'
    
    UNION ALL
    
    -- Video Upscaler
    SELECT 
      'Video Upscaler'::TEXT as tool_name,
      COUNT(*)::BIGINT as total_jobs,
      COALESCE(ROUND(AVG(rh_cost)::NUMERIC, 2), 0) as avg_rh_cost,
      COALESCE(ROUND(AVG(user_credit_cost)::NUMERIC, 2), 0) as avg_credit_cost,
      COALESCE(SUM(rh_cost)::NUMERIC, 0) as total_rh_cost,
      COALESCE(SUM(user_credit_cost)::NUMERIC, 0) as total_credit_cost
    FROM video_upscaler_jobs
    WHERE status = 'completed'
  ) combined
  ORDER BY tool_name;
END;
$$;