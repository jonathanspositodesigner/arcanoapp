
-- =====================================================
-- MovieLed Maker Jobs Table
-- =====================================================
CREATE TABLE public.movieled_maker_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL,
  session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  engine TEXT NOT NULL DEFAULT 'veo3.1',
  
  -- Input data
  input_image_url TEXT NULL,
  input_file_name TEXT NULL,
  input_text TEXT NULL,
  reference_prompt_id UUID NULL,
  
  -- Job tracking
  task_id TEXT NULL,
  api_account TEXT NOT NULL DEFAULT 'default',
  position INTEGER NULL,
  waited_in_queue BOOLEAN NULL DEFAULT false,
  queue_wait_seconds INTEGER NULL,
  
  -- Output
  output_url TEXT NULL,
  thumbnail_url TEXT NULL,
  
  -- Credits
  credits_charged BOOLEAN NULL DEFAULT false,
  credits_refunded BOOLEAN NULL DEFAULT false,
  user_credit_cost INTEGER NULL,
  rh_cost NUMERIC NULL,
  
  -- Debug/observability
  current_step TEXT NULL,
  failed_at_step TEXT NULL,
  step_history JSONB NULL,
  error_message TEXT NULL,
  job_payload JSONB NULL,
  raw_api_response JSONB NULL,
  raw_webhook_payload JSONB NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE NULL,
  completed_at TIMESTAMP WITH TIME ZONE NULL
);

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE public.movieled_maker_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own jobs
CREATE POLICY "Users can view own movieled jobs"
  ON public.movieled_maker_jobs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own jobs
CREATE POLICY "Users can insert own movieled jobs"
  ON public.movieled_maker_jobs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own jobs
CREATE POLICY "Users can delete own movieled jobs"
  ON public.movieled_maker_jobs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Service role can update all jobs (webhooks/queue manager)
CREATE POLICY "Service role can update movieled jobs"
  ON public.movieled_maker_jobs FOR UPDATE
  TO service_role
  USING (true);

-- Service role can select all jobs
CREATE POLICY "Service role can select all movieled jobs"
  ON public.movieled_maker_jobs FOR SELECT
  TO service_role
  USING (true);

-- Service role can insert jobs
CREATE POLICY "Service role can insert movieled jobs"
  ON public.movieled_maker_jobs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Admins can view all jobs
CREATE POLICY "Admins can view all movieled jobs"
  ON public.movieled_maker_jobs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- Enable Realtime
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.movieled_maker_jobs;
