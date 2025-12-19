-- Add reference image URL column for AI-generated content
ALTER TABLE admin_artes ADD COLUMN IF NOT EXISTS ai_reference_image_url TEXT;