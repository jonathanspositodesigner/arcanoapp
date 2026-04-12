
ALTER TABLE public.saved_characters
ADD COLUMN IF NOT EXISTS thumbnail_url text,
ADD COLUMN IF NOT EXISTS reference_image_url text;
