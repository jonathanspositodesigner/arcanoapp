
-- Drop cleanup first due to changed return type
DROP FUNCTION IF EXISTS public.cleanup_expired_ai_jobs();

CREATE OR REPLACE FUNCTION public.cleanup_expired_ai_jobs()
RETURNS TABLE (
  upscaler_deleted INTEGER,
  pose_changer_deleted INTEGER,
  veste_ai_deleted INTEGER,
  video_upscaler_deleted INTEGER,
  character_generator_deleted INTEGER,
  arcano_cloner_deleted INTEGER,
  image_generator_deleted INTEGER,
  video_generator_deleted INTEGER
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
  v_image_generator INTEGER;
  v_video_generator INTEGER;
  v_cutoff TIMESTAMPTZ := '2026-02-12T00:00:00Z';
BEGIN
  WITH deleted AS (
    DELETE FROM upscaler_jobs WHERE status = 'completed' AND completed_at IS NOT NULL
      AND CASE WHEN created_at >= v_cutoff THEN (completed_at + interval '24 hours') < now() ELSE (completed_at + interval '5 days') < now() END
    RETURNING id
  ) SELECT COUNT(*) INTO v_upscaler FROM deleted;

  WITH deleted AS (
    DELETE FROM pose_changer_jobs WHERE status = 'completed' AND completed_at IS NOT NULL
      AND CASE WHEN created_at >= v_cutoff THEN (completed_at + interval '24 hours') < now() ELSE (completed_at + interval '5 days') < now() END
    RETURNING id
  ) SELECT COUNT(*) INTO v_pose_changer FROM deleted;

  WITH deleted AS (
    DELETE FROM veste_ai_jobs WHERE status = 'completed' AND completed_at IS NOT NULL
      AND CASE WHEN created_at >= v_cutoff THEN (completed_at + interval '24 hours') < now() ELSE (completed_at + interval '5 days') < now() END
    RETURNING id
  ) SELECT COUNT(*) INTO v_veste_ai FROM deleted;

  WITH deleted AS (
    DELETE FROM video_upscaler_jobs WHERE status = 'completed' AND completed_at IS NOT NULL
      AND CASE WHEN created_at >= v_cutoff THEN (completed_at + interval '24 hours') < now() ELSE (completed_at + interval '5 days') < now() END
    RETURNING id
  ) SELECT COUNT(*) INTO v_video_upscaler FROM deleted;

  WITH deleted AS (
    DELETE FROM character_generator_jobs WHERE status = 'completed' AND completed_at IS NOT NULL
      AND CASE WHEN created_at >= v_cutoff THEN (completed_at + interval '24 hours') < now() ELSE (completed_at + interval '5 days') < now() END
    RETURNING id
  ) SELECT COUNT(*) INTO v_character_generator FROM deleted;

  WITH deleted AS (
    DELETE FROM arcano_cloner_jobs WHERE status = 'completed' AND completed_at IS NOT NULL
      AND CASE WHEN created_at >= v_cutoff THEN (completed_at + interval '24 hours') < now() ELSE (completed_at + interval '5 days') < now() END
    RETURNING id
  ) SELECT COUNT(*) INTO v_arcano_cloner FROM deleted;

  WITH deleted AS (
    DELETE FROM image_generator_jobs WHERE status = 'completed' AND completed_at IS NOT NULL
      AND (completed_at + interval '24 hours') < now()
    RETURNING id
  ) SELECT COUNT(*) INTO v_image_generator FROM deleted;

  WITH deleted AS (
    DELETE FROM video_generator_jobs WHERE status = 'completed' AND completed_at IS NOT NULL
      AND (completed_at + interval '24 hours') < now()
    RETURNING id
  ) SELECT COUNT(*) INTO v_video_generator FROM deleted;

  RETURN QUERY SELECT v_upscaler, v_pose_changer, v_veste_ai, v_video_upscaler, v_character_generator, v_arcano_cloner, v_image_generator, v_video_generator;
END;
$$;

-- Update delete to include new tables
CREATE OR REPLACE FUNCTION public.delete_user_ai_creation(p_creation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
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

  DELETE FROM image_generator_jobs WHERE id = p_creation_id AND user_id = v_user_id AND status = 'completed';
  IF FOUND THEN RETURN TRUE; END IF;

  DELETE FROM video_generator_jobs WHERE id = p_creation_id AND user_id = v_user_id AND status = 'completed';
  IF FOUND THEN RETURN TRUE; END IF;

  RETURN FALSE;
END;
$$;
