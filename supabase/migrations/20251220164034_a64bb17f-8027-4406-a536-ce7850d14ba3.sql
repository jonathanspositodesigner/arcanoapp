-- Create public buckets for migrated Cloudinary images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('artes-cloudinary', 'artes-cloudinary', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('prompts-cloudinary', 'prompts-cloudinary', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for public read access
CREATE POLICY "Public read access for artes-cloudinary"
ON storage.objects FOR SELECT
USING (bucket_id = 'artes-cloudinary');

CREATE POLICY "Public read access for prompts-cloudinary"
ON storage.objects FOR SELECT
USING (bucket_id = 'prompts-cloudinary');

-- Admin upload/delete access for artes-cloudinary
CREATE POLICY "Admins can upload to artes-cloudinary"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artes-cloudinary' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete from artes-cloudinary"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'artes-cloudinary' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Admin upload/delete access for prompts-cloudinary
CREATE POLICY "Admins can upload to prompts-cloudinary"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'prompts-cloudinary' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete from prompts-cloudinary"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'prompts-cloudinary' 
  AND has_role(auth.uid(), 'admin'::app_role)
);