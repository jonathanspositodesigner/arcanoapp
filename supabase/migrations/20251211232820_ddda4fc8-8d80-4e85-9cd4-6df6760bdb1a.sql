-- Add discount eligibility columns to push_subscriptions
ALTER TABLE public.push_subscriptions
ADD COLUMN IF NOT EXISTS discount_eligible boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS discount_claimed_at timestamp with time zone DEFAULT NULL;

-- Add notification discount columns to artes_packs
ALTER TABLE public.artes_packs
ADD COLUMN IF NOT EXISTS notification_discount_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_discount_percent integer DEFAULT 20,
ADD COLUMN IF NOT EXISTS checkout_link_notif_6_meses text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS checkout_link_notif_1_ano text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS checkout_link_notif_vitalicio text DEFAULT NULL;

-- Create index for faster eligibility lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_discount_eligible 
ON public.push_subscriptions(discount_eligible) 
WHERE discount_eligible = true;