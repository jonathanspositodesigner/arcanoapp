ALTER TABLE public.meta_campaign_insights ADD COLUMN IF NOT EXISTS meta_purchases integer NOT NULL DEFAULT 0;
ALTER TABLE public.meta_adset_insights ADD COLUMN IF NOT EXISTS meta_purchases integer NOT NULL DEFAULT 0;
ALTER TABLE public.meta_ad_insights ADD COLUMN IF NOT EXISTS meta_purchases integer NOT NULL DEFAULT 0;