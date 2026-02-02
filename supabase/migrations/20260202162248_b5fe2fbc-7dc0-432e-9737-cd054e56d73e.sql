-- Add email_content column to store the HTML sent
ALTER TABLE welcome_email_logs 
ADD COLUMN IF NOT EXISTS email_content TEXT;