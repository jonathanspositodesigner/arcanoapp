
-- ============================================================
-- Centralizar "Minhas Criações" para TODAS as ferramentas de IA
-- Inclui: upscaler, pose_changer, veste_ai, video_upscaler,
--         character_generator, arcano_cloner
-- Para adicionar futuras ferramentas: adicionar UNION ALL aqui
-- ============================================================

-- 1. Recriar get_user_ai_creations com TODAS as 6 tabelas
CREATE OR REPLACE FUNCTION public.get_user_ai_creations(
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
    -- Upscaler Arcano
    SELECT uj.id, uj.output_url, uj.thumbnail_url, 'Upscaler Arcano'::TEXT as tool_name, 'image'::TEXT as media_type, uj.created_at, (uj.completed_at + interval '5 days') as expires_at
    FROM upscaler_jobs uj WHERE uj.user_id = auth.uid() AND uj.status = 'completed' AND uj.output_url IS NOT NULL AND (uj.completed_at + interval '5 days') > now()

    UNION ALL

    -- Pose Changer
    SELECT pcj.id, pcj.output_url, pcj.thumbnail_url, 'Pose Changer'::TEXT, 'image'::TEXT, pcj.created_at, (pcj.completed_at + interval '5 days')
    FROM pose_changer_jobs pcj WHERE pcj.user_id = auth.uid() AND pcj.status = 'completed' AND pcj.output_url IS NOT NULL AND (pcj.completed_at + interval '5 days') > now()

    UNION ALL

    -- Veste AI
    SELECT vaj.id, vaj.output_url, vaj.thumbnail_url, 'Veste AI'::TEXT, 'image'::TEXT, vaj.created_at, (vaj.completed_at + interval '5 days')
    FROM veste_ai_jobs vaj WHERE vaj.user_id = auth.uid() AND vaj.status = 'completed' AND vaj.output_url IS NOT NULL AND (vaj.completed_at + interval '5 days') > now()

    UNION ALL

    -- Video Upscaler
    SELECT vuj.id, vuj.output_url, vuj.thumbnail_url, 'Video Upscaler'::TEXT, 'video'::TEXT, vuj.created_at, (vuj.completed_at + interval '5 days')
    FROM video_upscaler_jobs vuj WHERE vuj.user_id = auth.uid() AND vuj.status = 'completed' AND vuj.output_url IS NOT NULL AND (vuj.completed_at + interval '5 days') > now()

    UNION ALL

    -- Gerador Avatar
    SELECT cgj.id, cgj.output_url, cgj.thumbnail_url, 'Gerador Avatar'::TEXT, 'image'::TEXT, cgj.created_at, (cgj.completed_at + interval '5 days')
    FROM character_generator_jobs cgj WHERE cgj.user_id = auth.uid() AND cgj.status = 'completed' AND cgj.output_url IS NOT NULL AND (cgj.completed_at + interval '5 days') > now()

    UNION ALL

    -- Arcano Cloner
    SELECT acj.id, acj.output_url, acj.thumbnail_url, 'Arcano Cloner'::TEXT, 'image'::TEXT, acj.created_at, (acj.completed_at + interval '5 days')
    FROM arcano_cloner_jobs acj WHERE acj.user_id = auth.uid() AND acj.status = 'completed' AND acj.output_url IS NOT NULL AND (acj.completed_at + interval '5 days') > now()

    -- >> FUTURAS FERRAMENTAS: adicionar UNION ALL aqui <<
  )
  SELECT * FROM all_creations ac
  WHERE (p_media_type = 'all' OR ac.media_type = p_media_type)
  ORDER BY ac.created_at DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;

-- 2. Recriar cleanup_expired_ai_jobs com TODAS as 6 tabelas
DROP FUNCTION IF EXISTS public.cleanup_expired_ai_jobs();

CREATE OR REPLACE FUNCTION public.cleanup_expired_ai_jobs()
RETURNS TABLE (
  upscaler_deleted INTEGER,
  pose_changer_deleted INTEGER,
  veste_ai_deleted INTEGER,
  video_upscaler_deleted INTEGER,
  character_generator_deleted INTEGER,
  arcano_cloner_deleted INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upscaler INTEGER;
  v_pose_changer INTEGER;
  v_veste_ai INTEGER;
  v_video_upscaler INTEGER;
  v_character_generator INTEGER;
  v_arcano_cloner INTEGER;
BEGIN
  -- Upscaler
  WITH deleted AS (
    DELETE FROM upscaler_jobs WHERE status = 'completed' AND completed_at IS NOT NULL AND (completed_at + interval '5 days') < now() RETURNING id
  ) SELECT COUNT(*) INTO v_upscaler FROM deleted;

  -- Pose Changer
  WITH deleted AS (
    DELETE FROM pose_changer_jobs WHERE status = 'completed' AND completed_at IS NOT NULL AND (completed_at + interval '5 days') < now() RETURNING id
  ) SELECT COUNT(*) INTO v_pose_changer FROM deleted;

  -- Veste AI
  WITH deleted AS (
    DELETE FROM veste_ai_jobs WHERE status = 'completed' AND completed_at IS NOT NULL AND (completed_at + interval '5 days') < now() RETURNING id
  ) SELECT COUNT(*) INTO v_veste_ai FROM deleted;

  -- Video Upscaler
  WITH deleted AS (
    DELETE FROM video_upscaler_jobs WHERE status = 'completed' AND completed_at IS NOT NULL AND (completed_at + interval '5 days') < now() RETURNING id
  ) SELECT COUNT(*) INTO v_video_upscaler FROM deleted;

  -- Character Generator
  WITH deleted AS (
    DELETE FROM character_generator_jobs WHERE status = 'completed' AND completed_at IS NOT NULL AND (completed_at + interval '5 days') < now() RETURNING id
  ) SELECT COUNT(*) INTO v_character_generator FROM deleted;

  -- Arcano Cloner
  WITH deleted AS (
    DELETE FROM arcano_cloner_jobs WHERE status = 'completed' AND completed_at IS NOT NULL AND (completed_at + interval '5 days') < now() RETURNING id
  ) SELECT COUNT(*) INTO v_arcano_cloner FROM deleted;

  -- >> FUTURAS FERRAMENTAS: adicionar DELETE aqui <<

  RETURN QUERY SELECT v_upscaler, v_pose_changer, v_veste_ai, v_video_upscaler, v_character_generator, v_arcano_cloner;
END;
$$;
