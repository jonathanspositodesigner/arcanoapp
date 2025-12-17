-- Add visitor_id column to page_views table for unique visitor tracking
ALTER TABLE public.page_views ADD COLUMN visitor_id text;