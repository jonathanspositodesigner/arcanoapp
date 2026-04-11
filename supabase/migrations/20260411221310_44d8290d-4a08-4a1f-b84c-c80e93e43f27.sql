
-- Drop the count function first to fix return type
DROP FUNCTION IF EXISTS public.get_ai_tools_usage_count(TIMESTAMPTZ, TIMESTAMPTZ);

-- Recreate count function including seedance_jobs
CREATE OR REPLACE FUNCTION public.get_ai_tools_usage_count(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE total_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM (
    SELECT id FROM upscaler_jobs WHERE user_id IS NOT NULL AND (p_start_date IS NULL OR created_at >= p_start_date) AND (p_end_date IS NULL OR created_at <= p_end_date)
    UNION ALL
    SELECT id FROM pose_changer_jobs WHERE user_id IS NOT NULL AND (p_start_date IS NULL OR created_at >= p_start_date) AND (p_end_date IS NULL OR created_at <= p_end_date)
    UNION ALL
    SELECT id FROM veste_ai_jobs WHERE user_id IS NOT NULL AND (p_start_date IS NULL OR created_at >= p_start_date) AND (p_end_date IS NULL OR created_at <= p_end_date)
    UNION ALL
    SELECT id FROM video_upscaler_jobs WHERE user_id IS NOT NULL AND (p_start_date IS NULL OR created_at >= p_start_date) AND (p_end_date IS NULL OR created_at <= p_end_date)
    UNION ALL
    SELECT id FROM arcano_cloner_jobs WHERE user_id IS NOT NULL AND (p_start_date IS NULL OR created_at >= p_start_date) AND (p_end_date IS NULL OR created_at <= p_end_date)
    UNION ALL
    SELECT id FROM character_generator_jobs WHERE user_id IS NOT NULL AND (p_start_date IS NULL OR created_at >= p_start_date) AND (p_end_date IS NULL OR created_at <= p_end_date)
    UNION ALL
    SELECT id FROM flyer_maker_jobs WHERE user_id IS NOT NULL AND (p_start_date IS NULL OR created_at >= p_start_date) AND (p_end_date IS NULL OR created_at <= p_end_date)
    UNION ALL
    SELECT id FROM bg_remover_jobs WHERE user_id IS NOT NULL AND (p_start_date IS NULL OR created_at >= p_start_date) AND (p_end_date IS NULL OR created_at <= p_end_date)
    UNION ALL
    SELECT id FROM image_generator_jobs WHERE user_id IS NOT NULL AND (p_start_date IS NULL OR created_at >= p_start_date) AND (p_end_date IS NULL OR created_at <= p_end_date)
    UNION ALL
    SELECT id FROM video_generator_jobs WHERE user_id IS NOT NULL AND (p_start_date IS NULL OR created_at >= p_start_date) AND (p_end_date IS NULL OR created_at <= p_end_date)
    UNION ALL
    SELECT id FROM movieled_maker_jobs WHERE user_id IS NOT NULL AND (p_start_date IS NULL OR created_at >= p_start_date) AND (p_end_date IS NULL OR created_at <= p_end_date)
    UNION ALL
    SELECT id FROM seedance_jobs WHERE user_id IS NOT NULL AND (p_start_date IS NULL OR created_at >= p_start_date) AND (p_end_date IS NULL OR created_at <= p_end_date)
  ) AS all_jobs;
  RETURN total_count;
END;
$$;
