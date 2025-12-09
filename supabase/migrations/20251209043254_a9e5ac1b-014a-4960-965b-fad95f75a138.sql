-- Create table for promotional banners
CREATE TABLE public.artes_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  button_text TEXT NOT NULL DEFAULT 'Saiba mais',
  button_link TEXT NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.artes_banners ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage banners" 
ON public.artes_banners 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active banners" 
ON public.artes_banners 
FOR SELECT 
USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_artes_banners_updated_at
BEFORE UPDATE ON public.artes_banners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();