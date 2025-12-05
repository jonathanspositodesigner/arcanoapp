-- Fix admin_prompts INSERT policy - remove public access, restrict to admins only
DROP POLICY IF EXISTS "Anyone can insert admin prompts" ON public.admin_prompts;

CREATE POLICY "Only admins can insert admin prompts"
ON public.admin_prompts
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix storage bucket policies - remove public upload access for admin-prompts bucket
DROP POLICY IF EXISTS "Anyone can upload admin prompt images" ON storage.objects;

CREATE POLICY "Only admins can upload admin prompt images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'admin-prompts' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);