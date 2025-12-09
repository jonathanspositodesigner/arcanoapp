-- Add pack column to admin_artes table
ALTER TABLE public.admin_artes ADD COLUMN pack text;

-- Add pack column to partner_artes table
ALTER TABLE public.partner_artes ADD COLUMN pack text;