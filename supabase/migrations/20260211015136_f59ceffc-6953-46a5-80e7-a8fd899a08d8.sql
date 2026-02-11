-- Policy for Arcano Cloner user image uploads
CREATE POLICY "Authenticated users can upload to user folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artes-cloudinary'
  AND (storage.foldername(name))[1] = 'user'
  AND auth.uid() IS NOT NULL
);

-- Policy for Arcano Cloner/Pose Changer reference image uploads
CREATE POLICY "Authenticated users can upload to reference folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artes-cloudinary'
  AND (storage.foldername(name))[1] = 'reference'
  AND auth.uid() IS NOT NULL
);