
ALTER TABLE public.webhook_logs ADD COLUMN IF NOT EXISTS utm_data jsonb DEFAULT NULL;
