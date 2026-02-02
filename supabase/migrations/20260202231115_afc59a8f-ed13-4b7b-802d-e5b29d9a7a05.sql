-- Create pose_changer_jobs table for the Pose Changer AI tool
CREATE TABLE public.pose_changer_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  task_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  
  -- Input files (RunningHub filenames after upload)
  person_file_name TEXT,
  reference_file_name TEXT,
  
  -- Output
  output_url TEXT,
  error_message TEXT,
  position INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Index for queue processing
CREATE INDEX idx_pose_changer_jobs_status ON pose_changer_jobs(status);
CREATE INDEX idx_pose_changer_jobs_session ON pose_changer_jobs(session_id);
CREATE INDEX idx_pose_changer_jobs_user ON pose_changer_jobs(user_id);
CREATE INDEX idx_pose_changer_jobs_task_id ON pose_changer_jobs(task_id);

-- Enable Realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE pose_changer_jobs;

-- RLS Policies
ALTER TABLE pose_changer_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own jobs (by user_id or session_id match)
CREATE POLICY "Users can view own jobs by user_id" ON pose_changer_jobs
  FOR SELECT USING (user_id = auth.uid());

-- Allow insert for authenticated users
CREATE POLICY "Authenticated users can insert jobs" ON pose_changer_jobs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow service role to update jobs (for webhook processing)
CREATE POLICY "Service role can update all jobs" ON pose_changer_jobs
  FOR UPDATE USING (true);

-- Create function to update pose changer queue positions
CREATE OR REPLACE FUNCTION public.update_pose_changer_queue_positions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE pose_changer_jobs AS pj
  SET position = ranked.new_position
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS new_position
    FROM pose_changer_jobs
    WHERE status = 'queued'
  ) AS ranked
  WHERE pj.id = ranked.id AND pj.status = 'queued';
END;
$$;

-- Create cleanup function for stale pose changer jobs
CREATE OR REPLACE FUNCTION public.cleanup_stale_pose_changer_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE pose_changer_jobs 
  SET status = 'failed', error_message = 'Job timeout - marked as abandoned'
  WHERE status IN ('running', 'queued') 
  AND created_at < NOW() - INTERVAL '10 minutes';
  
  DELETE FROM pose_changer_jobs 
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;