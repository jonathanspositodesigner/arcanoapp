ALTER TABLE image_generator_jobs 
ADD COLUMN IF NOT EXISTS engine text DEFAULT 'nano_banana';

ALTER TABLE image_generator_jobs
ADD COLUMN IF NOT EXISTS runninghub_task_id text;