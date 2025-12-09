-- Add type column to artes_packs to distinguish between pack, bonus, and curso
ALTER TABLE public.artes_packs 
ADD COLUMN type text NOT NULL DEFAULT 'pack';

-- Add constraint to ensure valid types
ALTER TABLE public.artes_packs 
ADD CONSTRAINT artes_packs_type_check 
CHECK (type IN ('pack', 'bonus', 'curso'));