-- Add missing columns to email_templates table
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS sender_name text DEFAULT 'Vox Visual',
ADD COLUMN IF NOT EXISTS sender_email text DEFAULT 'contato@voxvisual.com.br';