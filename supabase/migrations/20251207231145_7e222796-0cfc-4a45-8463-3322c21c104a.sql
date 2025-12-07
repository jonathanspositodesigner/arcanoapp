-- Add rejected column to partner_prompts table for rejection workflow
ALTER TABLE public.partner_prompts 
ADD COLUMN rejected boolean DEFAULT false,
ADD COLUMN rejected_at timestamp with time zone,
ADD COLUMN rejected_by uuid;