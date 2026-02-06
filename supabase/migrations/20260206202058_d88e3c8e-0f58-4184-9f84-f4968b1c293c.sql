-- RPC para buscar criações do usuário em todas as ferramentas de IA
-- Retorna jobs completos com output_url, filtrados por expiração de 5 dias

CREATE OR REPLACE FUNCTION public.get_user_ai_creations(
  p_media_type TEXT DEFAULT 'all',  -- 'all', 'image', 'video'
  p_offset INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 24
)
RETURNS TABLE (
  id UUID,
  output_url TEXT,
  tool_name TEXT,
  media_type TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH all_creations AS (
    -- Upscaler (imagens)
    SELECT 
      uj.id,
      uj.output_url,
      'Upscaler Arcano'::TEXT as tool_name,
      'image'::TEXT as media_type,
      uj.created_at,
      (uj.completed_at + interval '5 days') as expires_at
    FROM upscaler_jobs uj
    WHERE uj.user_id = auth.uid()
      AND uj.status = 'completed'
      AND uj.output_url IS NOT NULL
      AND (uj.completed_at + interval '5 days') > now()
    
    UNION ALL
    
    -- Pose Changer (imagens)
    SELECT 
      pcj.id,
      pcj.output_url,
      'Pose Changer'::TEXT,
      'image'::TEXT,
      pcj.created_at,
      (pcj.completed_at + interval '5 days')
    FROM pose_changer_jobs pcj
    WHERE pcj.user_id = auth.uid()
      AND pcj.status = 'completed'
      AND pcj.output_url IS NOT NULL
      AND (pcj.completed_at + interval '5 days') > now()
    
    UNION ALL
    
    -- Veste AI (imagens)
    SELECT 
      vaj.id,
      vaj.output_url,
      'Veste AI'::TEXT,
      'image'::TEXT,
      vaj.created_at,
      (vaj.completed_at + interval '5 days')
    FROM veste_ai_jobs vaj
    WHERE vaj.user_id = auth.uid()
      AND vaj.status = 'completed'
      AND vaj.output_url IS NOT NULL
      AND (vaj.completed_at + interval '5 days') > now()
    
    UNION ALL
    
    -- Video Upscaler (vídeos)
    SELECT 
      vuj.id,
      vuj.output_url,
      'Video Upscaler'::TEXT,
      'video'::TEXT,
      vuj.created_at,
      (vuj.completed_at + interval '5 days')
    FROM video_upscaler_jobs vuj
    WHERE vuj.user_id = auth.uid()
      AND vuj.status = 'completed'
      AND vuj.output_url IS NOT NULL
      AND (vuj.completed_at + interval '5 days') > now()
  )
  SELECT * FROM all_creations ac
  WHERE (p_media_type = 'all' OR ac.media_type = p_media_type)
  ORDER BY ac.created_at DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;