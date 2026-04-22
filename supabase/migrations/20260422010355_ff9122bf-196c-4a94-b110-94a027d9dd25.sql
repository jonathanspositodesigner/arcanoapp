
CREATE TABLE public.gpt_image_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id TEXT,
  status TEXT DEFAULT 'pending',
  prompt TEXT NOT NULL,
  size TEXT DEFAULT 'auto',
  input_image_urls TEXT[],
  output_url TEXT,
  error_message TEXT,
  credits_charged INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  thumbnail_url TEXT
);

ALTER TABLE public.gpt_image_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gpt_image_jobs"
  ON public.gpt_image_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gpt_image_jobs"
  ON public.gpt_image_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update gpt_image_jobs"
  ON public.gpt_image_jobs FOR UPDATE
  USING (true);

CREATE INDEX idx_gpt_image_jobs_user_status ON public.gpt_image_jobs(user_id, status);
CREATE INDEX idx_gpt_image_jobs_task_id ON public.gpt_image_jobs(task_id);
