
-- 1. Add columns to mp_products for subscription mapping
ALTER TABLE public.mp_products 
  ADD COLUMN IF NOT EXISTS plan_slug TEXT NULL,
  ADD COLUMN IF NOT EXISTS billing_period TEXT NULL;

-- 2. Add pagarme_subscription_id to asaas_orders
ALTER TABLE public.asaas_orders 
  ADD COLUMN IF NOT EXISTS pagarme_subscription_id TEXT NULL;

-- 3. Add pagarme_subscription_id to planos2_subscriptions
ALTER TABLE public.planos2_subscriptions 
  ADD COLUMN IF NOT EXISTS pagarme_subscription_id TEXT NULL;
