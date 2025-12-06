-- Add tutorial_url column to admin_prompts table for video tutorials
ALTER TABLE public.admin_prompts ADD COLUMN tutorial_url text;