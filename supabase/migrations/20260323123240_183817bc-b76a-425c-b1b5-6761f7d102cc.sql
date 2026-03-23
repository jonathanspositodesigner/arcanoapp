
CREATE TABLE public.user_google_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  api_key text NOT NULL,
  total_credits numeric DEFAULT 1800.00,
  used_credits numeric DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_google_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own api key" ON public.user_google_api_keys
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api key" ON public.user_google_api_keys
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api key" ON public.user_google_api_keys
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own api key" ON public.user_google_api_keys
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
