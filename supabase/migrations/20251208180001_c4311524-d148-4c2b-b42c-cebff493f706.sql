-- Create user_sessions table for tracking page time and bounce rate
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  entered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  exited_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER DEFAULT 0,
  device_type TEXT NOT NULL DEFAULT 'desktop',
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tutorial_events table for tracking tutorial progress
CREATE TABLE public.tutorial_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  step_id INTEGER,
  device_type TEXT NOT NULL DEFAULT 'mobile',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutorial_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_sessions
CREATE POLICY "Anyone can insert sessions"
ON public.user_sessions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update their own session"
ON public.user_sessions
FOR UPDATE
USING (true);

CREATE POLICY "Admins can view all sessions"
ON public.user_sessions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for tutorial_events
CREATE POLICY "Anyone can insert tutorial events"
ON public.tutorial_events
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all tutorial events"
ON public.tutorial_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add indexes for performance
CREATE INDEX idx_user_sessions_session_id ON public.user_sessions(session_id);
CREATE INDEX idx_user_sessions_page_path ON public.user_sessions(page_path);
CREATE INDEX idx_user_sessions_entered_at ON public.user_sessions(entered_at);
CREATE INDEX idx_tutorial_events_session_id ON public.tutorial_events(session_id);
CREATE INDEX idx_tutorial_events_event_type ON public.tutorial_events(event_type);
CREATE INDEX idx_tutorial_events_created_at ON public.tutorial_events(created_at);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tutorial_events;