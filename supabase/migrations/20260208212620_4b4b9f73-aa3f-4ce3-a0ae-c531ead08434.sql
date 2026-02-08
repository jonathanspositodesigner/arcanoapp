-- Add tags column to admin_prompts table for keyword search
ALTER TABLE public.admin_prompts 
ADD COLUMN tags TEXT[] DEFAULT NULL;