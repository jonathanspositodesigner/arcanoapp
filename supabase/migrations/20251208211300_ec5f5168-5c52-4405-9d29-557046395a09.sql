-- =====================================================
-- BIBLIOTECA DE ARTES ARCANAS - Database Structure
-- =====================================================

-- Table for admin-uploaded artes
CREATE TABLE public.admin_artes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  download_url TEXT,
  description TEXT,
  category TEXT NOT NULL,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  bonus_clicks INTEGER NOT NULL DEFAULT 0,
  tutorial_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for community-submitted artes
CREATE TABLE public.community_artes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  download_url TEXT,
  description TEXT,
  category TEXT NOT NULL,
  contributor_name TEXT,
  bonus_clicks INTEGER NOT NULL DEFAULT 0,
  approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for partner-submitted artes
CREATE TABLE public.partner_artes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  download_url TEXT,
  description TEXT,
  category TEXT NOT NULL,
  is_premium BOOLEAN DEFAULT true,
  bonus_clicks INTEGER NOT NULL DEFAULT 0,
  tutorial_url TEXT,
  approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  rejected BOOLEAN DEFAULT false,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejected_by UUID,
  deletion_requested BOOLEAN DEFAULT false,
  deletion_requested_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for arte clicks tracking
CREATE TABLE public.arte_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  arte_id UUID NOT NULL,
  arte_title TEXT NOT NULL,
  is_admin_arte BOOLEAN NOT NULL DEFAULT true,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for admin collections of artes
CREATE TABLE public.admin_arte_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for collection items
CREATE TABLE public.admin_arte_collection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.admin_arte_collections(id) ON DELETE CASCADE,
  arte_id UUID NOT NULL,
  arte_type TEXT NOT NULL DEFAULT 'admin',
  item_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.admin_artes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_artes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_artes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arte_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_arte_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_arte_collection_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES FOR admin_artes
-- =====================================================

CREATE POLICY "Anyone can view all artes"
ON public.admin_artes FOR SELECT
USING (true);

CREATE POLICY "Only admins can insert admin artes"
ON public.admin_artes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update admin artes"
ON public.admin_artes FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete admin artes"
ON public.admin_artes FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- RLS POLICIES FOR community_artes
-- =====================================================

CREATE POLICY "Anyone can insert community artes"
ON public.community_artes FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view approved community artes"
ON public.community_artes FOR SELECT
USING (approved = true);

CREATE POLICY "Admins can view all community artes"
ON public.community_artes FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update community artes"
ON public.community_artes FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete community artes"
ON public.community_artes FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- RLS POLICIES FOR partner_artes
-- =====================================================

CREATE POLICY "Partners can insert their own artes"
ON public.partner_artes FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM partners
  WHERE partners.id = partner_artes.partner_id
  AND partners.user_id = auth.uid()
));

CREATE POLICY "Partners can view their own artes"
ON public.partner_artes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM partners
  WHERE partners.id = partner_artes.partner_id
  AND partners.user_id = auth.uid()
));

CREATE POLICY "Partners can update their own artes"
ON public.partner_artes FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM partners
  WHERE partners.id = partner_artes.partner_id
  AND partners.user_id = auth.uid()
));

CREATE POLICY "Anyone can view approved partner artes"
ON public.partner_artes FOR SELECT
USING (approved = true);

CREATE POLICY "Admins can manage all partner artes"
ON public.partner_artes FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- RLS POLICIES FOR arte_clicks
-- =====================================================

CREATE POLICY "Anyone can insert arte clicks"
ON public.arte_clicks FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view arte click counts"
ON public.arte_clicks FOR SELECT
USING (true);

CREATE POLICY "Admins can view all arte clicks"
ON public.arte_clicks FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- RLS POLICIES FOR admin_arte_collections
-- =====================================================

CREATE POLICY "Anyone can view arte collections by slug"
ON public.admin_arte_collections FOR SELECT
USING (true);

CREATE POLICY "Admins can manage arte collections"
ON public.admin_arte_collections FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- RLS POLICIES FOR admin_arte_collection_items
-- =====================================================

CREATE POLICY "Anyone can view arte collection items"
ON public.admin_arte_collection_items FOR SELECT
USING (true);

CREATE POLICY "Admins can manage arte collection items"
ON public.admin_arte_collection_items FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- CREATE STORAGE BUCKETS
-- =====================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('admin-artes', 'admin-artes', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('community-artes', 'community-artes', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('partner-artes', 'partner-artes', false);

-- =====================================================
-- STORAGE POLICIES FOR admin-artes bucket
-- =====================================================

CREATE POLICY "Anyone can view admin artes files"
ON storage.objects FOR SELECT
USING (bucket_id = 'admin-artes');

CREATE POLICY "Admins can upload admin artes files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'admin-artes' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update admin artes files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'admin-artes' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete admin artes files"
ON storage.objects FOR DELETE
USING (bucket_id = 'admin-artes' AND has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- STORAGE POLICIES FOR community-artes bucket
-- =====================================================

CREATE POLICY "Anyone can view community artes files"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-artes');

CREATE POLICY "Anyone can upload community artes files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'community-artes');

CREATE POLICY "Admins can update community artes files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'community-artes' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete community artes files"
ON storage.objects FOR DELETE
USING (bucket_id = 'community-artes' AND has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- STORAGE POLICIES FOR partner-artes bucket
-- =====================================================

CREATE POLICY "Anyone can view partner artes files"
ON storage.objects FOR SELECT
USING (bucket_id = 'partner-artes');

CREATE POLICY "Partners can upload partner artes files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'partner-artes' AND (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'partner'::app_role)
));

CREATE POLICY "Admins can update partner artes files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'partner-artes' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete partner artes files"
ON storage.objects FOR DELETE
USING (bucket_id = 'partner-artes' AND has_role(auth.uid(), 'admin'::app_role));