
CREATE POLICY "Partners can upload to prompts-cloudinary"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'prompts-cloudinary'
  AND public.has_role(auth.uid(), 'partner'::public.app_role)
);
