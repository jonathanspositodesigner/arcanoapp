
-- Tabela de categorias gerenciáveis por ferramenta
CREATE TABLE public.ai_tool_library_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_slug TEXT NOT NULL, -- 'arcano_cloner' | 'veste_ai' | 'pose_maker' | 'flyer_maker' | 'seedance2'
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tool_slug, slug)
);

-- Tabela de itens da biblioteca por ferramenta
CREATE TABLE public.ai_tool_library_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_slug TEXT NOT NULL,
  source_table TEXT NOT NULL, -- 'admin_prompts' | 'admin_artes'
  source_id UUID NOT NULL,
  category_id UUID REFERENCES public.ai_tool_library_categories(id) ON DELETE SET NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tool_slug, source_id)
);

CREATE INDEX idx_ai_tool_library_items_tool ON public.ai_tool_library_items(tool_slug, is_visible);
CREATE INDEX idx_ai_tool_library_items_category ON public.ai_tool_library_items(category_id);
CREATE INDEX idx_ai_tool_library_categories_tool ON public.ai_tool_library_categories(tool_slug, display_order);

-- RLS
ALTER TABLE public.ai_tool_library_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tool_library_items ENABLE ROW LEVEL SECURITY;

-- Leitura pública (ferramentas precisam exibir aos usuários)
CREATE POLICY "Public can read library categories"
ON public.ai_tool_library_categories FOR SELECT
USING (true);

CREATE POLICY "Public can read library items"
ON public.ai_tool_library_items FOR SELECT
USING (true);

-- Apenas admins podem gerenciar
CREATE POLICY "Admins manage library categories"
ON public.ai_tool_library_categories FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage library items"
ON public.ai_tool_library_items FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
CREATE TRIGGER update_ai_tool_library_categories_updated_at
BEFORE UPDATE ON public.ai_tool_library_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_tool_library_items_updated_at
BEFORE UPDATE ON public.ai_tool_library_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Categorias iniciais para Cloner / Veste / Pose
INSERT INTO public.ai_tool_library_categories (tool_slug, name, slug, display_order) VALUES
  ('arcano_cloner', 'Cantor/Artista', 'cantor-artista', 1),
  ('arcano_cloner', 'Profissões', 'profissoes', 2),
  ('arcano_cloner', 'Jogador', 'jogador', 3),
  ('arcano_cloner', 'Outros', 'outros', 99),
  ('veste_ai', 'Cantor/Artista', 'cantor-artista', 1),
  ('veste_ai', 'Profissões', 'profissoes', 2),
  ('veste_ai', 'Jogador', 'jogador', 3),
  ('veste_ai', 'Outros', 'outros', 99),
  ('pose_maker', 'Cantor/Artista', 'cantor-artista', 1),
  ('pose_maker', 'Profissões', 'profissoes', 2),
  ('pose_maker', 'Jogador', 'jogador', 3),
  ('pose_maker', 'Outros', 'outros', 99);

-- Migração: marcar como visíveis (categoria "Outros") todos os admin_prompts categoria 'Fotos' para Cloner/Veste/Pose
INSERT INTO public.ai_tool_library_items (tool_slug, source_table, source_id, category_id, is_visible)
SELECT 'arcano_cloner', 'admin_prompts', ap.id,
  (SELECT id FROM public.ai_tool_library_categories WHERE tool_slug='arcano_cloner' AND slug='outros'),
  true
FROM public.admin_prompts ap WHERE ap.category = 'Fotos';

INSERT INTO public.ai_tool_library_items (tool_slug, source_table, source_id, category_id, is_visible)
SELECT 'veste_ai', 'admin_prompts', ap.id,
  (SELECT id FROM public.ai_tool_library_categories WHERE tool_slug='veste_ai' AND slug='outros'),
  true
FROM public.admin_prompts ap WHERE ap.category = 'Fotos';

INSERT INTO public.ai_tool_library_items (tool_slug, source_table, source_id, category_id, is_visible)
SELECT 'pose_maker', 'admin_prompts', ap.id,
  (SELECT id FROM public.ai_tool_library_categories WHERE tool_slug='pose_maker' AND slug='outros'),
  true
FROM public.admin_prompts ap WHERE ap.category = 'Fotos';

-- Seedance 2 (sem categoria, todos visíveis)
INSERT INTO public.ai_tool_library_items (tool_slug, source_table, source_id, is_visible)
SELECT 'seedance2', 'admin_prompts', ap.id, true
FROM public.admin_prompts ap WHERE ap.category = 'Seedance 2';

-- Flyer Maker (sem categoria, todas as artes visíveis)
INSERT INTO public.ai_tool_library_items (tool_slug, source_table, source_id, is_visible)
SELECT 'flyer_maker', 'admin_artes', aa.id, true
FROM public.admin_artes aa;
