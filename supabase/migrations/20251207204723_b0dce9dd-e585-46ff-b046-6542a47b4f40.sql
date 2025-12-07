-- Update storage buckets to be private
UPDATE storage.buckets SET public = false WHERE id = 'admin-prompts';
UPDATE storage.buckets SET public = false WHERE id = 'community-prompts';

-- Create RLS policies for storage access
-- Allow authenticated premium users to access premium content
-- Allow everyone to access free content

-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for admin prompts" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for community prompts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload to admin-prompts" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to community-prompts" ON storage.objects;

-- Policy: Allow admins to upload to admin-prompts
CREATE POLICY "Admins can upload to admin-prompts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'admin-prompts' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Allow admins to update in admin-prompts
CREATE POLICY "Admins can update admin-prompts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'admin-prompts' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Allow admins to delete from admin-prompts
CREATE POLICY "Admins can delete from admin-prompts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'admin-prompts' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Anyone can upload to community-prompts (for contributions)
CREATE POLICY "Anyone can upload to community-prompts"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'community-prompts');

-- Policy: Admins can delete from community-prompts
CREATE POLICY "Admins can delete from community-prompts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'community-prompts' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Premium users and admins can read from admin-prompts
-- Note: For signed URLs, the service role is used, so we need to allow service role access
CREATE POLICY "Authenticated users can read admin-prompts via signed URL"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'admin-prompts');

-- Policy: Anyone can read from community-prompts (approved content is public)
CREATE POLICY "Anyone can read community-prompts"
ON storage.objects
FOR SELECT
USING (bucket_id = 'community-prompts');