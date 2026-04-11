
-- Add thumbnail_url column to seedance_jobs
ALTER TABLE public.seedance_jobs ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Register seedance_jobs in the AI tool registry
INSERT INTO public.ai_tool_registry (table_name, tool_name, media_type, storage_folder, enabled, expiry_hours)
VALUES ('seedance_jobs', 'Seedance 2.0', 'video', 'seedance', true, 24)
ON CONFLICT DO NOTHING;
