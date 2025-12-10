-- Create collection_views table for tracking modal opens
CREATE TABLE public.collection_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL,
  collection_slug TEXT NOT NULL,
  collection_name TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'desktop',
  user_agent TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.collection_views ENABLE ROW LEVEL SECURITY;

-- Admins can view all collection views
CREATE POLICY "Admins can view all collection views"
  ON public.collection_views FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can insert collection views (anonymous tracking)
CREATE POLICY "Anyone can insert collection views"
  ON public.collection_views FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_collection_views_viewed_at ON public.collection_views(viewed_at);
CREATE INDEX idx_collection_views_slug ON public.collection_views(collection_slug);