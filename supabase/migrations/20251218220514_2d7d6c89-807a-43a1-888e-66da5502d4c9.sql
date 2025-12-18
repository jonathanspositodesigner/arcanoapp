-- Create partner_platforms table to define which platforms each partner can access
CREATE TABLE public.partner_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('prompts', 'artes_eventos', 'artes_musicos')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (partner_id, platform)
);

-- Enable RLS
ALTER TABLE public.partner_platforms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partner_platforms
CREATE POLICY "Admins can manage all partner platforms"
ON public.partner_platforms
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners can view their own platforms"
ON public.partner_platforms
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.partners
  WHERE partners.id = partner_platforms.partner_id
  AND partners.user_id = auth.uid()
));

-- Create partner_artes_musicos table for musician arts content
CREATE TABLE public.partner_artes_musicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  title text NOT NULL,
  image_url text NOT NULL,
  download_url text,
  description text,
  category text NOT NULL,
  canva_link text,
  drive_link text,
  tutorial_url text,
  pack text,
  is_premium boolean DEFAULT true,
  bonus_clicks integer DEFAULT 0,
  approved boolean DEFAULT false,
  approved_at timestamptz,
  approved_by uuid,
  rejected boolean DEFAULT false,
  rejected_at timestamptz,
  rejected_by uuid,
  deletion_requested boolean DEFAULT false,
  deletion_requested_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partner_artes_musicos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partner_artes_musicos
CREATE POLICY "Admins can manage all partner artes musicos"
ON public.partner_artes_musicos
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners can view their own artes musicos"
ON public.partner_artes_musicos
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.partners
  WHERE partners.id = partner_artes_musicos.partner_id
  AND partners.user_id = auth.uid()
));

CREATE POLICY "Partners can insert their own artes musicos"
ON public.partner_artes_musicos
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.partners
  WHERE partners.id = partner_artes_musicos.partner_id
  AND partners.user_id = auth.uid()
));

CREATE POLICY "Partners can update their own artes musicos"
ON public.partner_artes_musicos
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.partners
  WHERE partners.id = partner_artes_musicos.partner_id
  AND partners.user_id = auth.uid()
));

CREATE POLICY "Anyone can view approved partner artes musicos"
ON public.partner_artes_musicos
FOR SELECT
USING (approved = true);

-- Migrate existing partners from partners_artes to partner_platforms
-- This creates platform entries for existing artes partners
INSERT INTO public.partner_platforms (partner_id, platform, is_active)
SELECT p.id, 'artes_eventos', true
FROM public.partners p
WHERE NOT EXISTS (
  SELECT 1 FROM public.partner_platforms pp 
  WHERE pp.partner_id = p.id AND pp.platform = 'artes_eventos'
)
AND EXISTS (
  SELECT 1 FROM public.partners_artes pa 
  WHERE pa.user_id = p.user_id AND pa.is_active = true
);

-- Also add prompts platform for existing partners table entries
INSERT INTO public.partner_platforms (partner_id, platform, is_active)
SELECT id, 'prompts', true
FROM public.partners
WHERE NOT EXISTS (
  SELECT 1 FROM public.partner_platforms pp 
  WHERE pp.partner_id = partners.id AND pp.platform = 'prompts'
)
ON CONFLICT (partner_id, platform) DO NOTHING;