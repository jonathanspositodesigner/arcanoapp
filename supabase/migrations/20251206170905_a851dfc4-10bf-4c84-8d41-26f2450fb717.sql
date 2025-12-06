-- Create table for tracking app installations
CREATE TABLE public.app_installations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_type TEXT NOT NULL CHECK (device_type IN ('mobile', 'desktop')),
  user_agent TEXT,
  installed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_installations ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (to track installations)
CREATE POLICY "Anyone can insert installations"
ON public.app_installations
FOR INSERT
WITH CHECK (true);

-- Only admins can view installations
CREATE POLICY "Admins can view all installations"
ON public.app_installations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));