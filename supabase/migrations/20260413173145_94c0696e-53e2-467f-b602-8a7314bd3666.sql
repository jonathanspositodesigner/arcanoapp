
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_users', (SELECT count(*) FROM profiles),
    'total_videos', (
      (SELECT count(*) FROM video_generator_jobs WHERE status = 'completed') +
      (SELECT count(*) FROM movieled_maker_jobs WHERE status = 'completed') +
      (SELECT count(*) FROM seedance_jobs WHERE status = 'completed') +
      (SELECT count(*) FROM video_upscaler_jobs WHERE status = 'completed')
    )
  );
$$;
