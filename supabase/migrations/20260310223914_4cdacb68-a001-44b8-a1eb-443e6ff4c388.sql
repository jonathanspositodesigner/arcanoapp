ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS event_type TEXT;