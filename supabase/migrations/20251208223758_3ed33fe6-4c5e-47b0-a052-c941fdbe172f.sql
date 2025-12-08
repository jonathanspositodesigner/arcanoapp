-- Create artes_categories table for dynamic categories in Artes Arcanas
CREATE TABLE public.artes_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.artes_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view categories
CREATE POLICY "Anyone can view artes categories"
ON public.artes_categories
FOR SELECT
USING (true);

-- Only admins can manage categories
CREATE POLICY "Admins can manage artes categories"
ON public.artes_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create prompts_categories table for dynamic categories in Prompts
CREATE TABLE public.prompts_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_admin_only BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prompts_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view categories
CREATE POLICY "Anyone can view prompts categories"
ON public.prompts_categories
FOR SELECT
USING (true);

-- Only admins can manage categories
CREATE POLICY "Admins can manage prompts categories"
ON public.prompts_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger for both tables
CREATE TRIGGER update_artes_categories_updated_at
BEFORE UPDATE ON public.artes_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prompts_categories_updated_at
BEFORE UPDATE ON public.prompts_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default artes categories
INSERT INTO public.artes_categories (name, slug, display_order) VALUES
('Aniversário', 'aniversario', 1),
('Casamento', 'casamento', 2),
('Formatura', 'formatura', 3),
('15 Anos', '15-anos', 4),
('Batizado', 'batizado', 5),
('Chá de Bebê', 'cha-de-bebe', 6),
('Corporativo', 'corporativo', 7),
('Outros', 'outros', 8);

-- Insert default prompts categories
INSERT INTO public.prompts_categories (name, slug, display_order, is_admin_only) VALUES
('Selos 3D', 'selos-3d', 1, false),
('Fotos', 'fotos', 2, false),
('Cenários', 'cenarios', 3, false),
('Controles de Câmera', 'controles-de-camera', 4, true),
('Movies para Telão', 'movies-para-telao', 5, false);