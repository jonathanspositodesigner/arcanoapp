-- Add column to track if sale came from app
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS from_app BOOLEAN DEFAULT FALSE;
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS utm_source TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_webhook_logs_from_app ON webhook_logs(from_app) WHERE from_app = true;