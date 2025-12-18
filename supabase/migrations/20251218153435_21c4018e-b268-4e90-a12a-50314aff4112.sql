-- Add platform field to admin_artes to separate eventos vs musicos
ALTER TABLE admin_artes ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'eventos';

-- Add AI generation fields
ALTER TABLE admin_artes ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false;
ALTER TABLE admin_artes ADD COLUMN IF NOT EXISTS ai_prompt TEXT;

-- Create categories table for musicians platform
CREATE TABLE IF NOT EXISTS artes_categories_musicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE artes_categories_musicos ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage musicos categories" 
ON artes_categories_musicos 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view musicos categories" 
ON artes_categories_musicos 
FOR SELECT 
USING (true);

-- Insert initial categories
INSERT INTO artes_categories_musicos (name, slug, display_order) VALUES
  ('Agendas', 'agendas', 1),
  ('Lançamento de Música', 'lancamento-musica', 2),
  ('Telão de LED', 'telao-led', 3),
  ('Presskit Digital', 'presskit-digital', 4)
ON CONFLICT (slug) DO NOTHING;