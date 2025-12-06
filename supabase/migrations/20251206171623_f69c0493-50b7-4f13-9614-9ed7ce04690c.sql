-- Create table for page views/accesses
CREATE TABLE public.page_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path TEXT NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT
);

-- Create table for prompt copy clicks
CREATE TABLE public.prompt_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID NOT NULL,
  prompt_title TEXT NOT NULL,
  is_admin_prompt BOOLEAN NOT NULL DEFAULT true,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_clicks ENABLE ROW LEVEL SECURITY;

-- Policies for page_views
CREATE POLICY "Anyone can insert page views" ON public.page_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all page views" ON public.page_views FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies for prompt_clicks
CREATE POLICY "Anyone can insert prompt clicks" ON public.prompt_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all prompt clicks" ON public.prompt_clicks FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));