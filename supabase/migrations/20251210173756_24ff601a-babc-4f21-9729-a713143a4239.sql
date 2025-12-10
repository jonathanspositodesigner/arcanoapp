-- Add checkout link columns to artes_packs table
ALTER TABLE public.artes_packs 
ADD COLUMN IF NOT EXISTS checkout_link_6_meses TEXT,
ADD COLUMN IF NOT EXISTS checkout_link_1_ano TEXT,
ADD COLUMN IF NOT EXISTS checkout_link_vitalicio TEXT;