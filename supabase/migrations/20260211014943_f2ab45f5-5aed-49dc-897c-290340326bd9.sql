CREATE POLICY "Authenticated users can upload to character-generator folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artes-cloudinary'
  AND (storage.foldername(name))[1] = 'character-generator'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND auth.uid() IS NOT NULL
);