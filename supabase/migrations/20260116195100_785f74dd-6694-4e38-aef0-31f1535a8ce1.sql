-- Add Hotmart columns to user_pack_purchases
ALTER TABLE public.user_pack_purchases 
ADD COLUMN IF NOT EXISTS hotmart_product_id INTEGER,
ADD COLUMN IF NOT EXISTS hotmart_transaction TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_pack_purchases_hotmart_transaction 
ON public.user_pack_purchases(hotmart_transaction);

-- Add index for platform filtering
CREATE INDEX IF NOT EXISTS idx_user_pack_purchases_platform 
ON public.user_pack_purchases(platform);