-- Table to track daily downloads for musicians platform
CREATE TABLE public.daily_musicos_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  arte_id UUID NOT NULL,
  download_date DATE NOT NULL DEFAULT CURRENT_DATE,
  downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_daily_musicos_downloads_user_date ON public.daily_musicos_downloads(user_id, download_date);

-- Enable RLS
ALTER TABLE public.daily_musicos_downloads ENABLE ROW LEVEL SECURITY;

-- Users can insert their own downloads
CREATE POLICY "Users can insert their own musicos downloads"
ON public.daily_musicos_downloads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own downloads
CREATE POLICY "Users can view their own musicos downloads"
ON public.daily_musicos_downloads
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all downloads
CREATE POLICY "Admins can view all musicos downloads"
ON public.daily_musicos_downloads
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to get daily download count for musicians
CREATE OR REPLACE FUNCTION public.get_daily_musicos_download_count(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  download_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO download_count
  FROM daily_musicos_downloads
  WHERE user_id = _user_id
    AND download_date = CURRENT_DATE;
  
  RETURN COALESCE(download_count, 0);
END;
$$;