
-- RLS: bg-remover folder is already covered by the universal policy
-- "Authenticated users can upload to own AI tool folders" which checks:
--   bucket_id = 'artes-cloudinary' AND (storage.foldername(name))[2] = auth.uid()::text
-- However, we need SELECT policy so users can read their own results back

-- Check if SELECT policy exists for bg-remover, add if missing
CREATE POLICY "Users can read own bg-remover files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'artes-cloudinary'
  AND (storage.foldername(name))[1] = 'bg-remover'
  AND (storage.foldername(name))[2] = (auth.uid())::text
);
