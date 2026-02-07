-- ============================================
-- THUMBNAILS PERSISTENTES PARA MINHAS CRIAÇÕES
-- ============================================

-- 1. Criar bucket público para thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-thumbnails', 'ai-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS: Leitura pública (thumbnails são públicas)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Thumbnails públicas para leitura' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Thumbnails públicas para leitura"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'ai-thumbnails');
  END IF;
END $$;

-- 3. RLS: Apenas service role pode inserir (via Edge Function)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role insere thumbnails' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Service role insere thumbnails"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'ai-thumbnails');
  END IF;
END $$;

-- 4. RLS: Service role pode deletar (limpeza automática)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role deleta thumbnails' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Service role deleta thumbnails"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'ai-thumbnails');
  END IF;
END $$;

-- 5. Adicionar coluna thumbnail_url nas tabelas de jobs
ALTER TABLE upscaler_jobs ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE pose_changer_jobs ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE veste_ai_jobs ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE video_upscaler_jobs ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 6. Dropar função existente e recriar com novo retorno
DROP FUNCTION IF EXISTS public.get_user_ai_creations(TEXT, INTEGER, INTEGER);

CREATE FUNCTION public.get_user_ai_creations(
  p_media_type TEXT DEFAULT 'all',
  p_offset INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 24
)
RETURNS TABLE (
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
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH all_creations AS (
    -- Upscaler (imagens)
    SELECT 
      uj.id,
      uj.output_url,
      uj.thumbnail_url,
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
      pcj.thumbnail_url,
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
      vaj.thumbnail_url,
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
      vuj.thumbnail_url,
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