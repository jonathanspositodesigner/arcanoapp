
-- Create saved-avatars bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('saved-avatars', 'saved-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: users can upload to their own folder
CREATE POLICY "Users can upload own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'saved-avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: anyone can view (public bucket)
CREATE POLICY "Public read saved avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'saved-avatars');

-- RLS: users can delete their own avatars
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'saved-avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
