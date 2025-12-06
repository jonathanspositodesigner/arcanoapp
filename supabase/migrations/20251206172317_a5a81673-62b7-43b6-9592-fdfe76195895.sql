-- Add device_type column to page_views
ALTER TABLE public.page_views ADD COLUMN device_type TEXT NOT NULL DEFAULT 'desktop';