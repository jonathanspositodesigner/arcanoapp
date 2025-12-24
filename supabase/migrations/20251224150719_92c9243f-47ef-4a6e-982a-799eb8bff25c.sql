-- TURN ALL MEDIA BUCKETS PUBLIC TO ELIMINATE get-signed-url COSTS
-- This is the MAIN cost saver - eliminates ~95% of edge function invocations

-- Make admin-prompts bucket public
UPDATE storage.buckets SET public = true WHERE id = 'admin-prompts';

-- Make admin-artes bucket public  
UPDATE storage.buckets SET public = true WHERE id = 'admin-artes';

-- Make partner-prompts bucket public
UPDATE storage.buckets SET public = true WHERE id = 'partner-prompts';

-- Make partner-artes bucket public
UPDATE storage.buckets SET public = true WHERE id = 'partner-artes';

-- Make community-prompts bucket public
UPDATE storage.buckets SET public = true WHERE id = 'community-prompts';

-- Make community-artes bucket public
UPDATE storage.buckets SET public = true WHERE id = 'community-artes';

-- Add RLS policy for public read access on all buckets
-- This allows anyone to view files but still requires auth for upload/delete

-- For admin-prompts
CREATE POLICY "Public read access for admin-prompts"
ON storage.objects FOR SELECT
USING (bucket_id = 'admin-prompts');

-- For admin-artes
CREATE POLICY "Public read access for admin-artes"
ON storage.objects FOR SELECT
USING (bucket_id = 'admin-artes');

-- For partner-prompts
CREATE POLICY "Public read access for partner-prompts"
ON storage.objects FOR SELECT
USING (bucket_id = 'partner-prompts');

-- For partner-artes
CREATE POLICY "Public read access for partner-artes"
ON storage.objects FOR SELECT
USING (bucket_id = 'partner-artes');

-- For community-prompts
CREATE POLICY "Public read access for community-prompts"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-prompts');

-- For community-artes
CREATE POLICY "Public read access for community-artes"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-artes');