ALTER TABLE public.movieled_maker_jobs
  ADD COLUMN IF NOT EXISTS content_mode text DEFAULT 'name',
  ADD COLUMN IF NOT EXISTS logo_image_url text;

ALTER TABLE public.movieled_maker_jobs
  DROP CONSTRAINT IF EXISTS movieled_maker_jobs_content_mode_check;

ALTER TABLE public.movieled_maker_jobs
  ADD CONSTRAINT movieled_maker_jobs_content_mode_check
  CHECK (content_mode IN ('name', 'logo'));