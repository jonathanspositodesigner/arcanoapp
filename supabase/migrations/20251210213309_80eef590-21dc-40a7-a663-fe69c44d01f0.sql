-- Add download_url column to artes_packs for bonus download links
ALTER TABLE public.artes_packs ADD COLUMN IF NOT EXISTS download_url TEXT;