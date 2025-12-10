-- Add tutorial_lessons column to store video lessons for tutorials
ALTER TABLE public.artes_packs ADD COLUMN IF NOT EXISTS tutorial_lessons JSONB DEFAULT '[]'::jsonb;