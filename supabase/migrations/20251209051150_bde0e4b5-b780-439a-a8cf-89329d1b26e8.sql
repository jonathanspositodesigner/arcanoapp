-- Drop the existing check constraint and add a new one with all type options
ALTER TABLE artes_packs DROP CONSTRAINT IF EXISTS artes_packs_type_check;

ALTER TABLE artes_packs ADD CONSTRAINT artes_packs_type_check 
  CHECK (type IN ('pack', 'bonus', 'curso', 'updates', 'free-sample'));