CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'total_images', (
      (SELECT count(*) FROM public.upscaler_jobs WHERE status = 'completed') +
      (SELECT count(*) FROM public.pose_changer_jobs WHERE status = 'completed') +
      (SELECT count(*) FROM public.veste_ai_jobs WHERE status = 'completed') +
      (SELECT count(*) FROM public.arcano_cloner_jobs WHERE status = 'completed') +
      (SELECT count(*) FROM public.character_generator_jobs WHERE status = 'completed') +
      (SELECT count(*) FROM public.image_generator_jobs WHERE status = 'completed') +
      (SELECT count(*) FROM public.flyer_maker_jobs WHERE status = 'completed') +
      (SELECT count(*) FROM public.bg_remover_jobs WHERE status = 'completed')
    ),
    'total_videos', (
      (SELECT count(*) FROM public.video_generator_jobs WHERE status = 'completed') +
      (SELECT count(*) FROM public.movieled_maker_jobs WHERE status = 'completed') +
      (SELECT count(*) FROM public.seedance_jobs WHERE status = 'completed') +
      (SELECT count(*) FROM public.video_upscaler_jobs WHERE status = 'completed')
    )
  );
$$;