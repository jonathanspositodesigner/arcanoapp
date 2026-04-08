
CREATE TABLE public.cinema_saved_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('photo', 'video')),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cinema_saved_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own configs" ON public.cinema_saved_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own configs" ON public.cinema_saved_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own configs" ON public.cinema_saved_configs FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own configs" ON public.cinema_saved_configs FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_cinema_saved_configs_user_mode ON public.cinema_saved_configs (user_id, mode);
