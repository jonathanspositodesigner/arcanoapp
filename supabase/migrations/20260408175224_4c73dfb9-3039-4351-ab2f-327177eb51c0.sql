
CREATE TABLE public.seedance_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_id text,
  status text DEFAULT 'pending',
  model text NOT NULL,
  prompt text NOT NULL,
  duration integer DEFAULT 5,
  quality text DEFAULT '720p',
  aspect_ratio text DEFAULT '16:9',
  generate_audio boolean DEFAULT true,
  input_image_urls text[],
  input_video_urls text[],
  input_audio_urls text[],
  output_url text,
  error_message text,
  credits_charged integer,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  cancelled_at timestamptz
);

ALTER TABLE public.seedance_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_seedance_jobs" ON public.seedance_jobs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "service_role_seedance_jobs" ON public.seedance_jobs
  FOR ALL TO service_role USING (true);
