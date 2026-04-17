ALTER TABLE public.admin_artes ADD COLUMN IF NOT EXISTS flyer_subcategory text;
ALTER TABLE public.partner_artes ADD COLUMN IF NOT EXISTS flyer_subcategory text;
CREATE INDEX IF NOT EXISTS idx_admin_artes_flyer_subcategory ON public.admin_artes(flyer_subcategory);
CREATE INDEX IF NOT EXISTS idx_partner_artes_flyer_subcategory ON public.partner_artes(flyer_subcategory);