
-- Create artes_packs table for managing pack covers and names
CREATE TABLE public.artes_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cover_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.artes_packs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view packs" 
ON public.artes_packs 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage packs" 
ON public.artes_packs 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_artes_packs_updated_at
BEFORE UPDATE ON public.artes_packs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert existing packs
INSERT INTO public.artes_packs (name, slug, display_order) VALUES
('Pack Arcano Vol.1', 'pack-arcano-vol-1', 1),
('Pack Arcano Vol.2', 'pack-arcano-vol-2', 2),
('Pack Arcano Vol.3', 'pack-arcano-vol-3', 3),
('Pack Arcano Vol.4', 'pack-arcano-vol-4', 4),
('Pack Arcano Vol.5', 'pack-arcano-vol-5', 5),
('Pack Arcano Vol.6', 'pack-arcano-vol-6', 6);

-- Create storage bucket for pack covers
INSERT INTO storage.buckets (id, name, public) VALUES ('pack-covers', 'pack-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for pack covers
CREATE POLICY "Anyone can view pack covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'pack-covers');

CREATE POLICY "Admins can manage pack covers"
ON storage.objects FOR ALL
USING (bucket_id = 'pack-covers' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'pack-covers' AND has_role(auth.uid(), 'admin'::app_role));
