-- Create enum for access types
CREATE TYPE public.artes_access_type AS ENUM ('6_meses', '1_ano', 'vitalicio');

-- Create table for user pack purchases
CREATE TABLE public.user_pack_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pack_slug TEXT NOT NULL,
  access_type artes_access_type NOT NULL,
  has_bonus_access BOOLEAN NOT NULL DEFAULT false,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  greenn_contract_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_pack_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own pack purchases"
ON public.user_pack_purchases
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all pack purchases"
ON public.user_pack_purchases
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create function to check if user has access to a specific pack
CREATE OR REPLACE FUNCTION public.has_pack_access(_user_id uuid, _pack_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_pack_purchases
    WHERE user_id = _user_id
    AND pack_slug = _pack_slug
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Create function to check if user has bonus access (1 year or lifetime)
CREATE OR REPLACE FUNCTION public.has_bonus_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_pack_purchases
    WHERE user_id = _user_id
    AND has_bonus_access = true
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Create function to get all user's active packs
CREATE OR REPLACE FUNCTION public.get_user_packs(_user_id uuid)
RETURNS TABLE(pack_slug text, access_type artes_access_type, has_bonus boolean, expires_at timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pack_slug, access_type, has_bonus_access, expires_at
  FROM user_pack_purchases
  WHERE user_id = _user_id
  AND is_active = true
  AND (user_pack_purchases.expires_at IS NULL OR user_pack_purchases.expires_at > now())
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_user_pack_purchases_updated_at
BEFORE UPDATE ON public.user_pack_purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create bonus content table for exclusive content
CREATE TABLE public.artes_bonus_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content_url TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'video',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.artes_bonus_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bonus content
CREATE POLICY "Users with bonus access can view bonus content"
ON public.artes_bonus_content
FOR SELECT
USING (is_active = true AND has_bonus_access(auth.uid()));

CREATE POLICY "Admins can manage bonus content"
ON public.artes_bonus_content
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));