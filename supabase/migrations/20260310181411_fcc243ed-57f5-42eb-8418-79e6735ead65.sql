
-- Table for ad set level insights
CREATE TABLE public.meta_adset_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL,
  campaign_id text NOT NULL,
  campaign_name text NOT NULL,
  adset_id text NOT NULL,
  adset_name text NOT NULL,
  adset_status text DEFAULT 'UNKNOWN',
  daily_budget numeric DEFAULT 0,
  date date NOT NULL,
  spend numeric DEFAULT 0,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  cpm numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  landing_page_views integer DEFAULT 0,
  initiated_checkouts integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(adset_id, date)
);

-- Table for ad level insights
CREATE TABLE public.meta_ad_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL,
  campaign_id text NOT NULL,
  adset_id text NOT NULL,
  ad_id text NOT NULL,
  ad_name text NOT NULL,
  ad_status text DEFAULT 'UNKNOWN',
  date date NOT NULL,
  spend numeric DEFAULT 0,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  cpm numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  landing_page_views integer DEFAULT 0,
  initiated_checkouts integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(ad_id, date)
);

-- Enable RLS but allow public read (admin-only page protected by app auth)
ALTER TABLE public.meta_adset_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ad_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read meta_adset_insights" ON public.meta_adset_insights FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read meta_ad_insights" ON public.meta_ad_insights FOR SELECT TO authenticated USING (true);
