-- Add platform column to user_pack_purchases
ALTER TABLE user_pack_purchases ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'eventos';

-- Update existing records to 'eventos'
UPDATE user_pack_purchases SET platform = 'eventos' WHERE platform IS NULL;

-- Add platform column to artes_packs
ALTER TABLE artes_packs ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'eventos';

-- Update existing packs to 'eventos'
UPDATE artes_packs SET platform = 'eventos' WHERE platform IS NULL;

-- Add platform column to email_campaigns
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS platform TEXT;