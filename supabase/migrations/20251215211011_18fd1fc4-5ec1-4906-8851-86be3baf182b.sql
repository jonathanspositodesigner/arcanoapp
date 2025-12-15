-- Add click tracking column to push_notification_logs
ALTER TABLE public.push_notification_logs 
ADD COLUMN IF NOT EXISTS clicked_count integer DEFAULT 0;