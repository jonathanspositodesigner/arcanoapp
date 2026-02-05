-- Permitir usuários autenticados fazer upload para veste-ai/<user_id>/
CREATE POLICY "Authenticated users can upload to veste-ai folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'artes-cloudinary'
  AND (storage.foldername(name))[1] = 'veste-ai'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Permitir update (para upsert)
CREATE POLICY "Authenticated users can update veste-ai folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'artes-cloudinary'
  AND (storage.foldername(name))[1] = 'veste-ai'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'artes-cloudinary'
  AND (storage.foldername(name))[1] = 'veste-ai'
  AND (storage.foldername(name))[2] = auth.uid()::text
);