-- Inserir novos itens na tabela artes_packs
INSERT INTO public.artes_packs (name, slug, type, display_order) VALUES
  ('Pack + 19 Videos Animados', 'bonus-19-videos-animados', 'bonus', 100),
  ('Curso de Artes Animadas no Photoshop', 'curso-artes-animadas-photoshop', 'curso', 101),
  ('Módulos Boas Vindas', 'curso-boas-vindas', 'curso', 102)
ON CONFLICT (slug) DO NOTHING;