-- Allow authenticated users to upload to pose-changer/<user_id>/ folder
CREATE POLICY "Authenticated users can upload to pose-changer folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'artes-cloudinary'
  AND (storage.foldername(name))[1] = 'pose-changer'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authenticated users to update their own files in pose-changer folder (for upsert)
CREATE POLICY "Authenticated users can update pose-changer folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'artes-cloudinary'
  AND (storage.foldername(name))[1] = 'pose-changer'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'artes-cloudinary'
  AND (storage.foldername(name))[1] = 'pose-changer'
  AND (storage.foldername(name))[2] = auth.uid()::text
);