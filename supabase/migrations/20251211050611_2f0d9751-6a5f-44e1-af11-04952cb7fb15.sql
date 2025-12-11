-- Add scheduling columns to email_campaigns table
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS is_scheduled boolean DEFAULT false;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS schedule_type text DEFAULT 'once'; -- 'once', 'daily', 'weekly', 'monthly'
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS scheduled_at timestamp with time zone; -- for one-time scheduled sends
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS scheduled_time time without time zone; -- time of day for recurring
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS scheduled_day_of_week integer; -- 0=Sunday, 1=Monday, etc
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS scheduled_day_of_month integer; -- 1-31
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS next_send_at timestamp with time zone;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS last_scheduled_send_at timestamp with time zone;