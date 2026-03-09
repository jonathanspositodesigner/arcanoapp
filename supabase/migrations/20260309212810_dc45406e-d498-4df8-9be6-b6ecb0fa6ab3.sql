
CREATE TABLE public.meta_ad_spend (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL,
  date date NOT NULL,
  spend numeric NOT NULL DEFAULT 0,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  cpm numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(account_id, date)
);

ALTER TABLE public.meta_ad_spend ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read meta_ad_spend"
  ON public.meta_ad_spend FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role insert meta_ad_spend"
  ON public.meta_ad_spend FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role update meta_ad_spend"
  ON public.meta_ad_spend FOR UPDATE TO service_role
  USING (true);
