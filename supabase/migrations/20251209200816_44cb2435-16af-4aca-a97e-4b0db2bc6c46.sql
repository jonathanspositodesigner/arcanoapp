-- Remover constraint antiga e adicionar nova com todos os tipos
ALTER TABLE artes_packs DROP CONSTRAINT IF EXISTS artes_packs_type_check;
ALTER TABLE artes_packs ADD CONSTRAINT artes_packs_type_check CHECK (type IN ('pack', 'bonus', 'curso', 'ferramenta', 'free-sample', 'updates'));

-- Adicionar novos CURSOS
INSERT INTO artes_packs (name, slug, type, display_order) VALUES
  ('Como Editar no After Effects', 'curso-after-effects', 'curso', 103),
  ('Como Editar no Photoshop', 'curso-photoshop', 'curso', 104),
  ('Como editar no Canva', 'curso-canva', 'curso', 105),
  ('Motion sem sair do Photoshop', 'curso-motion-photoshop', 'curso', 106),
  ('Tratamento de Fotos Pelo Celular', 'curso-tratamento-fotos', 'curso', 107)
ON CONFLICT (slug) DO NOTHING;

-- Adicionar novos BÔNUS
INSERT INTO artes_packs (name, slug, type, display_order) VALUES
  ('Selos 3D', 'bonus-selos-3d', 'bonus', 102),
  ('Artes Animadas Canva', 'bonus-artes-animadas-canva', 'bonus', 103)
ON CONFLICT (slug) DO NOTHING;

-- Adicionar FERRAMENTAS DE IA
INSERT INTO artes_packs (name, slug, type, display_order) VALUES
  ('I.A que muda a roupa', 'ia-muda-roupa', 'ferramenta', 1),
  ('I.A que muda a pose', 'ia-muda-pose', 'ferramenta', 2)
ON CONFLICT (slug) DO NOTHING;

-- Mover Upscaler e Forja para tipo ferramenta (se existirem)
UPDATE artes_packs SET type = 'ferramenta', display_order = 3 WHERE slug = 'upscaller-arcano';
UPDATE artes_packs SET type = 'ferramenta', display_order = 4 WHERE slug = 'forja-selos-3d-ilimitada';