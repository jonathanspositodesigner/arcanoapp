-- Add columns for automatic remarketing tracking
ALTER TABLE public.abandoned_checkouts 
ADD COLUMN IF NOT EXISTS remarketing_email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_remarketing_attempts INT DEFAULT 0;

-- Create index for efficient querying of pending remarketing
CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_remarketing 
ON public.abandoned_checkouts (remarketing_status, abandoned_at, remarketing_email_sent_at) 
WHERE remarketing_status = 'pending' AND remarketing_email_sent_at IS NULL;