
-- ============================================================
-- Expiração 24h para novos arquivos + exclusão manual
-- Arquivos criados ANTES de 2026-02-12 mantêm 5 dias
-- Arquivos criados A PARTIR de 2026-02-12 expiram em 24h
-- ============================================================

-- 1. Recriar get_user_ai_creations com expiração condicional
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
DECLARE
  v_cutoff TIMESTAMPTZ := '2026-02-12T00:00:00Z';
BEGIN
  RETURN QUERY
  WITH all_creations AS (
    -- Upscaler Arcano
    SELECT uj.id, uj.output_url, uj.thumbnail_url, 'Upscaler Arcano'::TEXT as tool_name, 'image'::TEXT as media_type, uj.created_at,
      CASE WHEN uj.created_at >= v_cutoff THEN (uj.completed_at + interval '24 hours') ELSE (uj.completed_at + interval '5 days') END as expires_at
    FROM upscaler_jobs uj WHERE uj.user_id = auth.uid() AND uj.status = 'completed' AND uj.output_url IS NOT NULL
      AND CASE WHEN uj.created_at >= v_cutoff THEN (uj.completed_at + interval '24 hours') > now() ELSE (uj.completed_at + interval '5 days') > now() END

    UNION ALL

    -- Pose Changer
    SELECT pcj.id, pcj.output_url, pcj.thumbnail_url, 'Pose Changer'::TEXT, 'image'::TEXT, pcj.created_at,
      CASE WHEN pcj.created_at >= v_cutoff THEN (pcj.completed_at + interval '24 hours') ELSE (pcj.completed_at + interval '5 days') END
    FROM pose_changer_jobs pcj WHERE pcj.user_id = auth.uid() AND pcj.status = 'completed' AND pcj.output_url IS NOT NULL
      AND CASE WHEN pcj.created_at >= v_cutoff THEN (pcj.completed_at + interval '24 hours') > now() ELSE (pcj.completed_at + interval '5 days') > now() END

    UNION ALL

    -- Veste AI
    SELECT vaj.id, vaj.output_url, vaj.thumbnail_url, 'Veste AI'::TEXT, 'image'::TEXT, vaj.created_at,
      CASE WHEN vaj.created_at >= v_cutoff THEN (vaj.completed_at + interval '24 hours') ELSE (vaj.completed_at + interval '5 days') END
    FROM veste_ai_jobs vaj WHERE vaj.user_id = auth.uid() AND vaj.status = 'completed' AND vaj.output_url IS NOT NULL
      AND CASE WHEN vaj.created_at >= v_cutoff THEN (vaj.completed_at + interval '24 hours') > now() ELSE (vaj.completed_at + interval '5 days') > now() END

    UNION ALL

    -- Video Upscaler
    SELECT vuj.id, vuj.output_url, vuj.thumbnail_url, 'Video Upscaler'::TEXT, 'video'::TEXT, vuj.created_at,
      CASE WHEN vuj.created_at >= v_cutoff THEN (vuj.completed_at + interval '24 hours') ELSE (vuj.completed_at + interval '5 days') END
    FROM video_upscaler_jobs vuj WHERE vuj.user_id = auth.uid() AND vuj.status = 'completed' AND vuj.output_url IS NOT NULL
      AND CASE WHEN vuj.created_at >= v_cutoff THEN (vuj.completed_at + interval '24 hours') > now() ELSE (vuj.completed_at + interval '5 days') > now() END

    UNION ALL

    -- Gerador Avatar
    SELECT cgj.id, cgj.output_url, cgj.thumbnail_url, 'Gerador Avatar'::TEXT, 'image'::TEXT, cgj.created_at,
      CASE WHEN cgj.created_at >= v_cutoff THEN (cgj.completed_at + interval '24 hours') ELSE (cgj.completed_at + interval '5 days') END
    FROM character_generator_jobs cgj WHERE cgj.user_id = auth.uid() AND cgj.status = 'completed' AND cgj.output_url IS NOT NULL
      AND CASE WHEN cgj.created_at >= v_cutoff THEN (cgj.completed_at + interval '24 hours') > now() ELSE (cgj.completed_at + interval '5 days') > now() END

    UNION ALL

    -- Arcano Cloner
    SELECT acj.id, acj.output_url, acj.thumbnail_url, 'Arcano Cloner'::TEXT, 'image'::TEXT, acj.created_at,
      CASE WHEN acj.created_at >= v_cutoff THEN (acj.completed_at + interval '24 hours') ELSE (acj.completed_at + interval '5 days') END
    FROM arcano_cloner_jobs acj WHERE acj.user_id = auth.uid() AND acj.status = 'completed' AND acj.output_url IS NOT NULL
      AND CASE WHEN acj.created_at >= v_cutoff THEN (acj.completed_at + interval '24 hours') > now() ELSE (acj.completed_at + interval '5 days') > now() END

    -- >> FUTURAS FERRAMENTAS: adicionar UNION ALL aqui <<
  )
  SELECT * FROM all_creations ac
  WHERE (p_media_type = 'all' OR ac.media_type = p_media_type)
  ORDER BY ac.created_at DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;

-- 2. Recriar cleanup com expiração condicional
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
  v_cutoff TIMESTAMPTZ := '2026-02-12T00:00:00Z';
BEGIN
  -- Upscaler
  WITH deleted AS (
    DELETE FROM upscaler_jobs WHERE status = 'completed' AND completed_at IS NOT NULL
      AND CASE WHEN created_at >= v_cutoff THEN (completed_at + interval '24 hours') < now() ELSE (completed_at + interval '5 days') < now() END
    RETURNING id
  ) SELECT COUNT(*) INTO v_upscaler FROM deleted;

  -- Pose Changer
  WITH deleted AS (
    DELETE FROM pose_changer_jobs WHERE status = 'completed' AND completed_at IS NOT NULL
      AND CASE WHEN created_at >= v_cutoff THEN (completed_at + interval '24 hours') < now() ELSE (completed_at + interval '5 days') < now() END
    RETURNING id
  ) SELECT COUNT(*) INTO v_pose_changer FROM deleted;

  -- Veste AI
  WITH deleted AS (
    DELETE FROM veste_ai_jobs WHERE status = 'completed' AND completed_at IS NOT NULL
      AND CASE WHEN created_at >= v_cutoff THEN (completed_at + interval '24 hours') < now() ELSE (completed_at + interval '5 days') < now() END
    RETURNING id
  ) SELECT COUNT(*) INTO v_veste_ai FROM deleted;

  -- Video Upscaler
  WITH deleted AS (
    DELETE FROM video_upscaler_jobs WHERE status = 'completed' AND completed_at IS NOT NULL
      AND CASE WHEN created_at >= v_cutoff THEN (completed_at + interval '24 hours') < now() ELSE (completed_at + interval '5 days') < now() END
    RETURNING id
  ) SELECT COUNT(*) INTO v_video_upscaler FROM deleted;

  -- Character Generator
  WITH deleted AS (
    DELETE FROM character_generator_jobs WHERE status = 'completed' AND completed_at IS NOT NULL
      AND CASE WHEN created_at >= v_cutoff THEN (completed_at + interval '24 hours') < now() ELSE (completed_at + interval '5 days') < now() END
    RETURNING id
  ) SELECT COUNT(*) INTO v_character_generator FROM deleted;

  -- Arcano Cloner
  WITH deleted AS (
    DELETE FROM arcano_cloner_jobs WHERE status = 'completed' AND completed_at IS NOT NULL
      AND CASE WHEN created_at >= v_cutoff THEN (completed_at + interval '24 hours') < now() ELSE (completed_at + interval '5 days') < now() END
    RETURNING id
  ) SELECT COUNT(*) INTO v_arcano_cloner FROM deleted;

  RETURN QUERY SELECT v_upscaler, v_pose_changer, v_veste_ai, v_video_upscaler, v_character_generator, v_arcano_cloner;
END;
$$;

-- 3. Criar RPC para exclusão manual de criação pelo usuário
CREATE OR REPLACE FUNCTION public.delete_user_ai_creation(p_creation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_deleted BOOLEAN := FALSE;
BEGIN
  -- Tenta deletar de cada tabela (só deleta se pertence ao usuário)
  DELETE FROM upscaler_jobs WHERE id = p_creation_id AND user_id = v_user_id AND status = 'completed';
  IF FOUND THEN RETURN TRUE; END IF;

  DELETE FROM pose_changer_jobs WHERE id = p_creation_id AND user_id = v_user_id AND status = 'completed';
  IF FOUND THEN RETURN TRUE; END IF;

  DELETE FROM veste_ai_jobs WHERE id = p_creation_id AND user_id = v_user_id AND status = 'completed';
  IF FOUND THEN RETURN TRUE; END IF;

  DELETE FROM video_upscaler_jobs WHERE id = p_creation_id AND user_id = v_user_id AND status = 'completed';
  IF FOUND THEN RETURN TRUE; END IF;

  DELETE FROM character_generator_jobs WHERE id = p_creation_id AND user_id = v_user_id AND status = 'completed';
  IF FOUND THEN RETURN TRUE; END IF;

  DELETE FROM arcano_cloner_jobs WHERE id = p_creation_id AND user_id = v_user_id AND status = 'completed';
  IF FOUND THEN RETURN TRUE; END IF;

  -- >> FUTURAS FERRAMENTAS: adicionar DELETE aqui <<

  RETURN FALSE;
END;
$$;
