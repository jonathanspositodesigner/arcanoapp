
CREATE TABLE public.meta_campaign_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL,
  campaign_id text NOT NULL,
  campaign_name text NOT NULL,
  campaign_status text,
  daily_budget numeric,
  date date NOT NULL,
  spend numeric DEFAULT 0,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  cpm numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  landing_page_views integer DEFAULT 0,
  initiated_checkouts integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, date)
);

ALTER TABLE public.meta_campaign_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read campaign insights" ON public.meta_campaign_insights
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage campaign insights" ON public.meta_campaign_insights
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
