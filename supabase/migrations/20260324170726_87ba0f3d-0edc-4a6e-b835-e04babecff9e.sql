ALTER TABLE public.mp_orders 
  ADD COLUMN IF NOT EXISTS meta_fbp text,
  ADD COLUMN IF NOT EXISTS meta_fbc text,
  ADD COLUMN IF NOT EXISTS meta_user_agent text,
  ADD COLUMN IF NOT EXISTS user_name text;