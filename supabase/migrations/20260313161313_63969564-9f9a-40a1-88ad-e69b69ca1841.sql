
-- Add diagnostic columns for checkout tracking
ALTER TABLE public.asaas_orders 
  ADD COLUMN IF NOT EXISTS checkout_request_id text,
  ADD COLUMN IF NOT EXISTS gateway_error_code text,
  ADD COLUMN IF NOT EXISTS gateway_error_message text,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;

-- Index for monitoring problematic orders
CREATE INDEX IF NOT EXISTS idx_asaas_orders_pending_monitoring 
  ON public.asaas_orders (status, asaas_payment_id, created_at) 
  WHERE status = 'pending';

-- Function to auto-cleanup orphaned pending orders (no payment_id after 30 min)
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_checkout_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cleaned INTEGER;
BEGIN
  UPDATE asaas_orders 
  SET status = 'failed', 
      gateway_error_message = 'Auto-cleanup: ordem pendente sem payment_id após 30 minutos',
      last_attempt_at = now()
  WHERE status = 'pending' 
    AND asaas_payment_id IS NULL 
    AND created_at < now() - interval '30 minutes';
  
  GET DIAGNOSTICS cleaned = ROW_COUNT;
  RETURN cleaned;
END;
$$;
