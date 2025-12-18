-- Create table for premium musicians users
CREATE TABLE public.premium_musicos_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_type TEXT,
  billing_period TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  greenn_product_id INTEGER,
  greenn_contract_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.premium_musicos_users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view all premium musicos users"
ON public.premium_musicos_users
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert premium musicos users"
ON public.premium_musicos_users
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update premium musicos users"
ON public.premium_musicos_users
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete premium musicos users"
ON public.premium_musicos_users
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own premium musicos status"
ON public.premium_musicos_users
FOR SELECT
USING (auth.uid() = user_id);

-- Create function to check if user is premium musicos
CREATE OR REPLACE FUNCTION public.is_premium_musicos()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM premium_musicos_users
    WHERE user_id = auth.uid()
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  )
$$;