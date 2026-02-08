-- Add fallback_attempted column to track De Longe → Standard retry
ALTER TABLE upscaler_jobs 
ADD COLUMN IF NOT EXISTS fallback_attempted BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN upscaler_jobs.fallback_attempted IS 'Tracks if the De Longe workflow already attempted a fallback to Standard workflow';

-- Add original_task_id to track the first task when fallback happens
ALTER TABLE upscaler_jobs 
ADD COLUMN IF NOT EXISTS original_task_id TEXT;

COMMENT ON COLUMN upscaler_jobs.original_task_id IS 'Stores the original task_id when fallback creates a new task';