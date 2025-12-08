-- Create premium_artes_users table for Artes premium system
CREATE TABLE public.premium_artes_users (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    plan_type text,
    billing_period text,
    is_active boolean NOT NULL DEFAULT true,
    subscribed_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    greenn_contract_id text,
    greenn_product_id integer
);

-- Enable RLS
ALTER TABLE public.premium_artes_users ENABLE ROW LEVEL SECURITY;

-- RLS policies for premium_artes_users
CREATE POLICY "Users can view their own premium artes status" 
ON public.premium_artes_users 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all premium artes users" 
ON public.premium_artes_users 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert premium artes users" 
ON public.premium_artes_users 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update premium artes users" 
ON public.premium_artes_users 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete premium artes users" 
ON public.premium_artes_users 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create partners_artes table for Artes partners
CREATE TABLE public.partners_artes (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    company text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partners_artes ENABLE ROW LEVEL SECURITY;

-- RLS policies for partners_artes
CREATE POLICY "Admins can manage all artes partners" 
ON public.partners_artes 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Artes partners can view their own profile" 
ON public.partners_artes 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create daily_arte_copies table for tracking downloads
CREATE TABLE public.daily_arte_copies (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    arte_id uuid NOT NULL,
    copied_at timestamp with time zone NOT NULL DEFAULT now(),
    copy_date date NOT NULL DEFAULT CURRENT_DATE
);

-- Enable RLS
ALTER TABLE public.daily_arte_copies ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_arte_copies
CREATE POLICY "Users can insert their own arte copies" 
ON public.daily_arte_copies 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own arte copies" 
ON public.daily_arte_copies 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all arte copies" 
ON public.daily_arte_copies 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create is_premium_artes function
CREATE OR REPLACE FUNCTION public.is_premium_artes()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM premium_artes_users
    WHERE user_id = auth.uid()
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Create get_daily_arte_copy_count function
CREATE OR REPLACE FUNCTION public.get_daily_arte_copy_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.daily_arte_copies
  WHERE user_id = _user_id
    AND copy_date = CURRENT_DATE
$$;