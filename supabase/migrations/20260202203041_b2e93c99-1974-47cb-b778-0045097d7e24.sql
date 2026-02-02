-- Permitir usuários autenticados fazer upload na pasta upscaler/
CREATE POLICY "Authenticated users can upload to upscaler folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'artes-cloudinary' 
  AND (storage.foldername(name))[1] = 'upscaler'
);