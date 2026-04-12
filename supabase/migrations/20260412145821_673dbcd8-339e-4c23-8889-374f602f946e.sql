ALTER TABLE public.asaas_orders
  ADD COLUMN IF NOT EXISTS whatsapp_welcome_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_welcome_sent_at timestamptz;