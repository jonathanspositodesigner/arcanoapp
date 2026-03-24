
-- Remove duplicate webhook_logs for the same MP transaction (keep earliest)
DELETE FROM public.webhook_logs
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY platform, transaction_id, event_type ORDER BY received_at ASC) as rn
    FROM public.webhook_logs
    WHERE platform = 'mercadopago'
  ) ranked
  WHERE rn > 1
);

-- Create unique index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_logs_mp_dedup
ON public.webhook_logs (platform, transaction_id, event_type)
WHERE platform = 'mercadopago' AND transaction_id IS NOT NULL;

-- Create unique index on mp_orders.mp_payment_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_orders_payment_id_unique
ON public.mp_orders (mp_payment_id)
WHERE mp_payment_id IS NOT NULL;
