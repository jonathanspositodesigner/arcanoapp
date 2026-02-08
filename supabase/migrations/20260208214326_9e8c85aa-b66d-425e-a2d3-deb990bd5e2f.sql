-- Create arcano_cloner_jobs table
CREATE TABLE public.arcano_cloner_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID,
  task_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  user_file_name TEXT,
  reference_file_name TEXT,
  user_image_url TEXT,
  reference_image_url TEXT,
  aspect_ratio TEXT DEFAULT '1:1',
  output_url TEXT,
  error_message TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rh_cost INTEGER,
  user_credit_cost INTEGER,
  waited_in_queue BOOLEAN DEFAULT false,
  queue_wait_seconds INTEGER,
  api_account TEXT NOT NULL DEFAULT 'primary',
  credits_charged BOOLEAN DEFAULT false,
  credits_refunded BOOLEAN DEFAULT false,
  job_payload JSONB,
  current_step TEXT,
  step_history JSONB,
  raw_api_response JSONB,
  raw_webhook_payload JSONB,
  failed_at_step TEXT,
  thumbnail_url TEXT
);

-- Create indexes for performance
CREATE INDEX idx_arcano_cloner_jobs_status ON arcano_cloner_jobs(status);
CREATE INDEX idx_arcano_cloner_jobs_session ON arcano_cloner_jobs(session_id);
CREATE INDEX idx_arcano_cloner_jobs_user ON arcano_cloner_jobs(user_id);
CREATE INDEX idx_arcano_cloner_jobs_task_id ON arcano_cloner_jobs(task_id);

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE arcano_cloner_jobs;

-- Enable Row Level Security
ALTER TABLE arcano_cloner_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own jobs
CREATE POLICY "Users can view own arcano_cloner_jobs" ON arcano_cloner_jobs
  FOR SELECT USING (user_id = auth.uid());

-- Authenticated users can insert their own jobs
CREATE POLICY "Authenticated users can insert arcano_cloner_jobs" ON arcano_cloner_jobs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Service role can do anything (for edge functions)
CREATE POLICY "Service role full access arcano_cloner_jobs" ON arcano_cloner_jobs
  FOR ALL USING (auth.role() = 'service_role');