-- Add USD price columns for LATAM
ALTER TABLE artes_packs ADD COLUMN IF NOT EXISTS price_6_meses_usd integer;
ALTER TABLE artes_packs ADD COLUMN IF NOT EXISTS price_1_ano_usd integer;
ALTER TABLE artes_packs ADD COLUMN IF NOT EXISTS price_vitalicio_usd integer;

-- Add LATAM checkout links
ALTER TABLE artes_packs ADD COLUMN IF NOT EXISTS checkout_link_latam_6_meses text;
ALTER TABLE artes_packs ADD COLUMN IF NOT EXISTS checkout_link_latam_1_ano text;
ALTER TABLE artes_packs ADD COLUMN IF NOT EXISTS checkout_link_latam_vitalicio text;

-- Add LATAM promo checkout links
ALTER TABLE artes_packs ADD COLUMN IF NOT EXISTS checkout_link_latam_promo_6_meses text;
ALTER TABLE artes_packs ADD COLUMN IF NOT EXISTS checkout_link_latam_promo_1_ano text;
ALTER TABLE artes_packs ADD COLUMN IF NOT EXISTS checkout_link_latam_promo_vitalicio text;

-- Add LATAM member checkout links
ALTER TABLE artes_packs ADD COLUMN IF NOT EXISTS checkout_link_latam_membro_6_meses text;
ALTER TABLE artes_packs ADD COLUMN IF NOT EXISTS checkout_link_latam_membro_1_ano text;
ALTER TABLE artes_packs ADD COLUMN IF NOT EXISTS checkout_link_latam_membro_vitalicio text;

-- Add LATAM renewal checkout links
ALTER TABLE artes_packs ADD COLUMN IF NOT EXISTS checkout_link_latam_renovacao_6_meses text;
ALTER TABLE artes_packs ADD COLUMN IF NOT EXISTS checkout_link_latam_renovacao_1_ano text;
ALTER TABLE artes_packs ADD COLUMN IF NOT EXISTS checkout_link_latam_renovacao_vitalicio text;