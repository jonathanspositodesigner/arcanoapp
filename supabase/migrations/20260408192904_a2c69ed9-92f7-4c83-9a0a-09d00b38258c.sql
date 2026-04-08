
-- Characters table
CREATE TABLE public.cinema_characters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cinema_characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own characters" ON public.cinema_characters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own characters" ON public.cinema_characters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own characters" ON public.cinema_characters FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own characters" ON public.cinema_characters FOR DELETE USING (auth.uid() = user_id);

-- Scenarios table
CREATE TABLE public.cinema_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cinema_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scenarios" ON public.cinema_scenarios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own scenarios" ON public.cinema_scenarios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scenarios" ON public.cinema_scenarios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scenarios" ON public.cinema_scenarios FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('cinema-assets', 'cinema-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Cinema assets are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'cinema-assets');
CREATE POLICY "Users can upload cinema assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'cinema-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own cinema assets" ON storage.objects FOR DELETE USING (bucket_id = 'cinema-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
