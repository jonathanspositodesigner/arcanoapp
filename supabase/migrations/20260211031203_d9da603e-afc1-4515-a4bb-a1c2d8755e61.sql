
-- Remove as 6 politicas individuais
DROP POLICY IF EXISTS "Authenticated users can upload to arcano-cloner folder" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to character-generator folder" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to pose-changer folder" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to veste-ai folder" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to video-upscaler folder" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to upscaler folder" ON storage.objects;

-- Cria 1 politica universal que substitui todas
CREATE POLICY "Authenticated users can upload to own AI tool folders"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artes-cloudinary'
  AND (storage.foldername(name))[2] = (auth.uid())::text
  AND auth.uid() IS NOT NULL
);
