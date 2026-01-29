-- Add motion_type column to admin_artes table
-- Values: 'canva', 'after_effects', or NULL (for images)
ALTER TABLE public.admin_artes 
ADD COLUMN motion_type TEXT DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN public.admin_artes.motion_type IS 'Type of motion for video files: canva, after_effects, or null for images';