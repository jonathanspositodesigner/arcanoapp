-- Add bonus_clicks column to admin_prompts table
ALTER TABLE public.admin_prompts ADD COLUMN IF NOT EXISTS bonus_clicks integer NOT NULL DEFAULT 0;

-- Add bonus_clicks column to partner_prompts table
ALTER TABLE public.partner_prompts ADD COLUMN IF NOT EXISTS bonus_clicks integer NOT NULL DEFAULT 0;

-- Add bonus_clicks column to community_prompts table  
ALTER TABLE public.community_prompts ADD COLUMN IF NOT EXISTS bonus_clicks integer NOT NULL DEFAULT 0;