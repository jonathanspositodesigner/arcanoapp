-- Add contributor_name column to community_prompts
ALTER TABLE public.community_prompts 
ADD COLUMN contributor_name text;