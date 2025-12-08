-- Add canva_link and drive_link columns to admin_artes table
ALTER TABLE public.admin_artes 
ADD COLUMN canva_link text,
ADD COLUMN drive_link text;

-- Add the same columns to partner_artes table for consistency
ALTER TABLE public.partner_artes 
ADD COLUMN canva_link text,
ADD COLUMN drive_link text;