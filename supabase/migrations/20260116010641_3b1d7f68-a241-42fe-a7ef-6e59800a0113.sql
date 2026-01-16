-- Add tool_versions column to artes_packs for storing version configurations
ALTER TABLE artes_packs 
ADD COLUMN IF NOT EXISTS tool_versions jsonb DEFAULT '[]'::jsonb;

-- Add comment to explain the column structure
COMMENT ON COLUMN artes_packs.tool_versions IS 'Array of version objects with id, name, slug, cover_url, display_order, is_visible, unlock_days, badges, lessons, webhook (greenn_product_ids), and sales (prices, checkout_links)';