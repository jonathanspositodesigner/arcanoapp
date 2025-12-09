-- Add 3_meses to the artes_access_type enum
ALTER TYPE artes_access_type ADD VALUE IF NOT EXISTS '3_meses';

-- Create new packs for Upscaller Arcano (curso) and Pack + 190 Videos Animados (bonus)
INSERT INTO artes_packs (name, slug, type, display_order)
VALUES 
  ('Upscaller Arcano', 'upscaller-arcano', 'curso', 100),
  ('Pack + 190 Videos Animados', 'bonus-190-videos-animados', 'bonus', 101)
ON CONFLICT (slug) DO NOTHING;