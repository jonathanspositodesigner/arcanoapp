
ALTER TABLE public.arcano_cloner_jobs
ADD COLUMN creativity integer NOT NULL DEFAULT 4,
ADD COLUMN custom_prompt text;
