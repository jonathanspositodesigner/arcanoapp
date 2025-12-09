-- Add is_visible column to artes_packs
ALTER TABLE artes_packs ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;