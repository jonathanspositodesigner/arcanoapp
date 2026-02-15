
-- Create the upscaler-uploads bucket for trial uploads (public so edge function can download)
INSERT INTO storage.buckets (id, name, public)
VALUES ('upscaler-uploads', 'upscaler-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload (trial users are unauthenticated)
CREATE POLICY "Anyone can upload to upscaler-uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'upscaler-uploads');

-- Allow public read access
CREATE POLICY "Anyone can read upscaler-uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'upscaler-uploads');
