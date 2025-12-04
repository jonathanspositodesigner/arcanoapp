-- Add is_premium column to admin_prompts table
ALTER TABLE public.admin_prompts ADD COLUMN is_premium boolean NOT NULL DEFAULT false;

-- Create premium_users table to track premium subscriptions
CREATE TABLE public.premium_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.premium_users ENABLE ROW LEVEL SECURITY;

-- Users can view their own premium status
CREATE POLICY "Users can view their own premium status"
ON public.premium_users
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage all premium users
CREATE POLICY "Admins can view all premium users"
ON public.premium_users
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert premium users"
ON public.premium_users
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update premium users"
ON public.premium_users
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete premium users"
ON public.premium_users
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));