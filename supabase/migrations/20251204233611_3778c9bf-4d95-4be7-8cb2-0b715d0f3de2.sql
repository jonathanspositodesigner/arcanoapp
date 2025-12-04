-- Add reference_images column to store URLs of reference images for videos
ALTER TABLE public.admin_prompts 
ADD COLUMN reference_images text[] DEFAULT NULL;