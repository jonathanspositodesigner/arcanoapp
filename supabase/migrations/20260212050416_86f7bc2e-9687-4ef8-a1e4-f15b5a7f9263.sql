
ALTER TABLE public.google_api_config ADD COLUMN key_changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
