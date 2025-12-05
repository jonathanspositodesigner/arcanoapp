-- Fix 1: Create is_premium() function to avoid exposing premium_users table data
CREATE OR REPLACE FUNCTION public.is_premium()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM premium_users
    WHERE user_id = auth.uid()
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Fix 2: Add UPDATE policy for user_roles (admins only)
CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix 3: Add DELETE policy for user_roles (admins only)
CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));