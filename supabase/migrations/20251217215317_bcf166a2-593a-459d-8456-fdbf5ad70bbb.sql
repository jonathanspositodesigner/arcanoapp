-- Add platform column to webhook_logs
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS platform text;

-- Add platform column to abandoned_checkouts
ALTER TABLE abandoned_checkouts ADD COLUMN IF NOT EXISTS platform text;

-- Update existing webhook_logs based on mapping_type
UPDATE webhook_logs SET platform = 'artes-eventos' WHERE mapping_type IN ('pack', 'promotion') AND platform IS NULL;
UPDATE webhook_logs SET platform = 'prompts' WHERE mapping_type IN ('arcano_basico', 'arcano_pro', 'arcano_unlimited') AND platform IS NULL;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_webhook_logs_platform ON webhook_logs(platform);
CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_platform ON abandoned_checkouts(platform);