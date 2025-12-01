-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update community_prompts to add approval status
ALTER TABLE public.community_prompts
ADD COLUMN approved BOOLEAN DEFAULT FALSE,
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN approved_by UUID REFERENCES auth.users(id);

-- Update RLS for community_prompts to only show approved ones to public
DROP POLICY IF EXISTS "Anyone can view community prompts" ON public.community_prompts;

CREATE POLICY "Anyone can view approved community prompts"
ON public.community_prompts
FOR SELECT
USING (approved = TRUE);

CREATE POLICY "Admins can view all community prompts"
ON public.community_prompts
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update community prompts"
ON public.community_prompts
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete community prompts"
ON public.community_prompts
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add RLS policies for admin_prompts management
CREATE POLICY "Admins can update admin prompts"
ON public.admin_prompts
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete admin prompts"
ON public.admin_prompts
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));