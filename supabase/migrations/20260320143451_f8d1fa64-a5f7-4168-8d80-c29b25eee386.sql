ALTER TABLE meta_campaign_insights ADD COLUMN IF NOT EXISTS meta_purchase_value numeric NOT NULL DEFAULT 0;
ALTER TABLE meta_adset_insights ADD COLUMN IF NOT EXISTS meta_purchase_value numeric NOT NULL DEFAULT 0;
ALTER TABLE meta_ad_insights ADD COLUMN IF NOT EXISTS meta_purchase_value numeric NOT NULL DEFAULT 0;