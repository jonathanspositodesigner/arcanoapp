-- Add mobile image column to artes_banners
ALTER TABLE public.artes_banners 
ADD COLUMN mobile_image_url text;