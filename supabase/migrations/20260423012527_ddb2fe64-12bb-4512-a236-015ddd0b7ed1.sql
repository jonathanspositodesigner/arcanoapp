
ALTER TABLE public.partner_prompts
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS tags text[];
