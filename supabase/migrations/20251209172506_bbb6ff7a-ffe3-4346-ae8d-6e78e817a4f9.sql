-- Create import_jobs table for tracking import progress
CREATE TABLE public.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running', -- running, paused, cancelled, completed
  total_records integer NOT NULL DEFAULT 0,
  processed_records integer DEFAULT 0,
  created_records integer DEFAULT 0,
  updated_records integer DEFAULT 0,
  skipped_records integer DEFAULT 0,
  error_count integer DEFAULT 0,
  started_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

-- Only admins can manage import jobs
CREATE POLICY "Admins can manage import jobs"
ON public.import_jobs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for import_jobs
ALTER PUBLICATION supabase_realtime ADD TABLE public.import_jobs;