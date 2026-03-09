
ALTER TABLE public.meta_ad_spend 
ADD COLUMN IF NOT EXISTS landing_page_views integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS initiated_checkouts integer DEFAULT 0;
