-- Add columns to store CSV data and track batch progress
ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS csv_data jsonb;
ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS current_batch integer DEFAULT 0;

-- Cancel the stuck job
UPDATE public.import_jobs 
SET status = 'cancelled', completed_at = now() 
WHERE status IN ('running', 'paused') AND completed_at IS NULL;