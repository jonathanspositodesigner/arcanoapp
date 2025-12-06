-- Add columns to premium_users for Greenn integration
ALTER TABLE premium_users 
ADD COLUMN IF NOT EXISTS plan_type TEXT,
ADD COLUMN IF NOT EXISTS billing_period TEXT,
ADD COLUMN IF NOT EXISTS subscribed_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS greenn_contract_id TEXT,
ADD COLUMN IF NOT EXISTS greenn_product_id INTEGER;