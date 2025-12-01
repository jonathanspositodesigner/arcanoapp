-- Enable RLS on community_prompts if not already enabled
ALTER TABLE public.community_prompts ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view community prompts
CREATE POLICY "Anyone can view community prompts"
ON public.community_prompts
FOR SELECT
USING (true);

-- Allow anyone to insert community prompts (public submissions)
CREATE POLICY "Anyone can insert community prompts"
ON public.community_prompts
FOR INSERT
WITH CHECK (true);

-- Create admin_prompts table for exclusive admin seals
CREATE TABLE public.admin_prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  category text NOT NULL,
  image_url text NOT NULL,
  title text NOT NULL,
  prompt text NOT NULL
);

-- Enable RLS on admin_prompts
ALTER TABLE public.admin_prompts ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view admin prompts
CREATE POLICY "Anyone can view admin prompts"
ON public.admin_prompts
FOR SELECT
USING (true);

-- Allow anyone to insert admin prompts (we'll add auth later if needed)
CREATE POLICY "Anyone can insert admin prompts"
ON public.admin_prompts
FOR INSERT
WITH CHECK (true);

-- Storage policies for community-prompts bucket
CREATE POLICY "Anyone can view community prompt images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'community-prompts');

CREATE POLICY "Anyone can upload community prompt images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'community-prompts');

-- Create admin-prompts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-prompts', 'admin-prompts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for admin-prompts bucket
CREATE POLICY "Anyone can view admin prompt images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'admin-prompts');

CREATE POLICY "Anyone can upload admin prompt images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'admin-prompts');