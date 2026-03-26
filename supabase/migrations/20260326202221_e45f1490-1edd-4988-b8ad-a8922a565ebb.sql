
-- Add missing columns to video_generator_jobs to match RunningHub pattern
ALTER TABLE public.video_generator_jobs
  ADD COLUMN IF NOT EXISTS model text NOT NULL DEFAULT 'veo3.1',
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS api_account text NOT NULL DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS task_id text,
  ADD COLUMN IF NOT EXISTS current_step text,
  ADD COLUMN IF NOT EXISTS failed_at_step text,
  ADD COLUMN IF NOT EXISTS step_history jsonb,
  ADD COLUMN IF NOT EXISTS position integer,
  ADD COLUMN IF NOT EXISTS queue_wait_seconds integer,
  ADD COLUMN IF NOT EXISTS waited_in_queue boolean,
  ADD COLUMN IF NOT EXISTS rh_cost numeric,
  ADD COLUMN IF NOT EXISTS raw_api_response jsonb,
  ADD COLUMN IF NOT EXISTS raw_webhook_payload jsonb,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS credits_refunded boolean DEFAULT false;

-- Enable realtime for video_generator_jobs
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_generator_jobs;
