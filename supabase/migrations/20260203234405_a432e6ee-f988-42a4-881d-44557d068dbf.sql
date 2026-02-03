-- Add storage policy for video-upscaler folder uploads
CREATE POLICY "Authenticated users can upload to video-upscaler folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'artes-cloudinary' 
  AND (storage.foldername(name))[1] = 'video-upscaler'
  AND (storage.foldername(name))[2] = auth.uid()::text
);