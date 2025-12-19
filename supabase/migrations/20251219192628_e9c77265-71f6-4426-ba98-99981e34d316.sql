-- Create app_settings table for global configurations
CREATE TABLE public.app_settings (
  id TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert initial year-end promo configuration
INSERT INTO app_settings (id, value) VALUES (
  'year_end_promo',
  '{
    "active": false,
    "name": "Promoção Especial de Fim de Ano!",
    "discount_percent": 50,
    "end_date": "2025-01-01T23:59:59"
  }'::jsonb
);

-- Enable Row Level Security
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view settings
CREATE POLICY "Anyone can view settings" 
ON public.app_settings 
FOR SELECT 
USING (true);

-- Only admins can manage settings
CREATE POLICY "Admins can manage settings" 
ON public.app_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add promo checkout link columns to artes_packs
ALTER TABLE public.artes_packs 
ADD COLUMN checkout_link_promo_6_meses TEXT,
ADD COLUMN checkout_link_promo_1_ano TEXT,
ADD COLUMN checkout_link_promo_vitalicio TEXT;