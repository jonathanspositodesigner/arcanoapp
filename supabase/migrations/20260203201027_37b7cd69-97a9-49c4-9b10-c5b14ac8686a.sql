-- Create veste_ai_jobs table for the Veste AI clothing change tool
CREATE TABLE public.veste_ai_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  task_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  person_file_name TEXT,
  clothing_file_name TEXT,
  output_url TEXT,
  error_message TEXT,
  position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster lookups
CREATE INDEX idx_veste_ai_jobs_session_status ON public.veste_ai_jobs(session_id, status);
CREATE INDEX idx_veste_ai_jobs_task_id ON public.veste_ai_jobs(task_id);
CREATE INDEX idx_veste_ai_jobs_status_created ON public.veste_ai_jobs(status, created_at);

-- Enable RLS
ALTER TABLE public.veste_ai_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own jobs" 
ON public.veste_ai_jobs 
FOR SELECT 
USING (user_id = auth.uid() OR session_id IS NOT NULL);

CREATE POLICY "Users can insert their own jobs" 
ON public.veste_ai_jobs 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own jobs" 
ON public.veste_ai_jobs 
FOR UPDATE 
USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.veste_ai_jobs;

-- Create RPC function to update queue positions
CREATE OR REPLACE FUNCTION public.update_veste_ai_queue_positions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE veste_ai_jobs AS vj
  SET position = ranked.new_position
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS new_position
    FROM veste_ai_jobs
    WHERE status = 'queued'
  ) AS ranked
  WHERE vj.id = ranked.id AND vj.status = 'queued';
END;
$function$;

-- Create cleanup function for stale jobs
CREATE OR REPLACE FUNCTION public.cleanup_stale_veste_ai_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE veste_ai_jobs 
  SET status = 'failed', error_message = 'Job timeout - marked as abandoned'
  WHERE status IN ('running', 'queued') 
  AND created_at < NOW() - INTERVAL '10 minutes';
  
  DELETE FROM veste_ai_jobs 
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$function$;