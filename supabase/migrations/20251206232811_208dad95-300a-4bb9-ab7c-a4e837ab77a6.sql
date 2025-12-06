-- Create admin collections table
CREATE TABLE public.admin_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create collection items table
CREATE TABLE public.admin_collection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.admin_collections(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL,
  prompt_type TEXT NOT NULL DEFAULT 'admin', -- 'admin' or 'community'
  item_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_collection_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_collections
CREATE POLICY "Admins can manage collections"
ON public.admin_collections
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view collections by slug"
ON public.admin_collections
FOR SELECT
USING (true);

-- RLS policies for admin_collection_items
CREATE POLICY "Admins can manage collection items"
ON public.admin_collection_items
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view collection items"
ON public.admin_collection_items
FOR SELECT
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_admin_collections_updated_at
BEFORE UPDATE ON public.admin_collections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_collection_items_collection_id ON public.admin_collection_items(collection_id);
CREATE INDEX idx_collections_slug ON public.admin_collections(slug);