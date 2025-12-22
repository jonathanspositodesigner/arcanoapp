-- Add thumbnail_url column to admin_prompts
ALTER TABLE public.admin_prompts 
ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Add thumbnail_url column to partner_prompts
ALTER TABLE public.partner_prompts 
ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Add thumbnail_url column to community_prompts
ALTER TABLE public.community_prompts 
ADD COLUMN IF NOT EXISTS thumbnail_url text;