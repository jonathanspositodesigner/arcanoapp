
ALTER TABLE public.asaas_orders
  ADD COLUMN IF NOT EXISTS user_address_line text,
  ADD COLUMN IF NOT EXISTS user_address_zip text,
  ADD COLUMN IF NOT EXISTS user_address_city text,
  ADD COLUMN IF NOT EXISTS user_address_state text,
  ADD COLUMN IF NOT EXISTS user_address_country text DEFAULT 'BR';
