-- Add gender column to admin_prompts table for photo categorization
ALTER TABLE admin_prompts 
ADD COLUMN gender TEXT DEFAULT NULL;