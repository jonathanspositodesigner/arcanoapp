ALTER TABLE public.planos2_subscriptions 
ADD COLUMN IF NOT EXISTS gpt_image_free_until TIMESTAMPTZ DEFAULT NULL;