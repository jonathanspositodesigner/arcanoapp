
-- Add RunningHub-specific columns to image_generator_jobs
ALTER TABLE public.image_generator_jobs
  ADD COLUMN IF NOT EXISTS task_id text,
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS input_urls jsonb,
  ADD COLUMN IF NOT EXISTS job_payload jsonb,
  ADD COLUMN IF NOT EXISTS current_step text,
  ADD COLUMN IF NOT EXISTS step_history jsonb,
  ADD COLUMN IF NOT EXISTS failed_at_step text,
  ADD COLUMN IF NOT EXISTS raw_webhook_payload jsonb,
  ADD COLUMN IF NOT EXISTS raw_api_response jsonb,
  ADD COLUMN IF NOT EXISTS api_account text DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS position integer,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS rh_cost numeric,
  ADD COLUMN IF NOT EXISTS waited_in_queue boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS queue_wait_seconds integer,
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Enable realtime for image_generator_jobs
ALTER PUBLICATION supabase_realtime ADD TABLE public.image_generator_jobs;
