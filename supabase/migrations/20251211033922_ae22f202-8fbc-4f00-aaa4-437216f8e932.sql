-- Create push notification analytics table
CREATE TABLE public.push_notification_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'prompt_shown', 'activated_prompt', 'activated_manual', 'dismissed', 'permission_denied'
  device_type TEXT NOT NULL DEFAULT 'desktop',
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.push_notification_analytics ENABLE ROW LEVEL SECURITY;

-- Anyone can insert analytics
CREATE POLICY "Anyone can insert push notification analytics"
ON public.push_notification_analytics
FOR INSERT
WITH CHECK (true);

-- Only admins can view analytics
CREATE POLICY "Admins can view push notification analytics"
ON public.push_notification_analytics
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Delete existing push subscriptions for fresh testing
DELETE FROM public.push_subscriptions;