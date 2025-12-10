-- Add price fields (in cents)
ALTER TABLE public.artes_packs ADD COLUMN IF NOT EXISTS price_6_meses INTEGER DEFAULT 2700;
ALTER TABLE public.artes_packs ADD COLUMN IF NOT EXISTS price_1_ano INTEGER DEFAULT 3700;
ALTER TABLE public.artes_packs ADD COLUMN IF NOT EXISTS price_vitalicio INTEGER DEFAULT 4700;

-- Add enabled toggle fields
ALTER TABLE public.artes_packs ADD COLUMN IF NOT EXISTS enabled_6_meses BOOLEAN DEFAULT true;
ALTER TABLE public.artes_packs ADD COLUMN IF NOT EXISTS enabled_1_ano BOOLEAN DEFAULT true;
ALTER TABLE public.artes_packs ADD COLUMN IF NOT EXISTS enabled_vitalicio BOOLEAN DEFAULT true;

-- Add renewal checkout links (30% OFF)
ALTER TABLE public.artes_packs ADD COLUMN IF NOT EXISTS checkout_link_renovacao_6_meses TEXT;
ALTER TABLE public.artes_packs ADD COLUMN IF NOT EXISTS checkout_link_renovacao_1_ano TEXT;
ALTER TABLE public.artes_packs ADD COLUMN IF NOT EXISTS checkout_link_renovacao_vitalicio TEXT;

-- Add member checkout links (20% OFF)
ALTER TABLE public.artes_packs ADD COLUMN IF NOT EXISTS checkout_link_membro_6_meses TEXT;
ALTER TABLE public.artes_packs ADD COLUMN IF NOT EXISTS checkout_link_membro_1_ano TEXT;
ALTER TABLE public.artes_packs ADD COLUMN IF NOT EXISTS checkout_link_membro_vitalicio TEXT;