-- Drop the existing check constraint
ALTER TABLE artes_packs DROP CONSTRAINT IF EXISTS artes_packs_type_check;

-- Add new check constraint with all types including existing and new ones
ALTER TABLE artes_packs ADD CONSTRAINT artes_packs_type_check 
CHECK (type IN ('pack', 'bonus', 'curso', 'updates', 'free-sample', 'ferramenta', 'tutorial', 'ferramentas_ia'));