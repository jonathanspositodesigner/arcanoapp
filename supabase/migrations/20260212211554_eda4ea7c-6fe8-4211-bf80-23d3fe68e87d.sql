
CREATE TABLE public.landing_page_trials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  name text NOT NULL,
  code text NOT NULL,
  code_verified boolean NOT NULL DEFAULT false,
  uses_remaining integer NOT NULL DEFAULT 3,
  uses_total integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE UNIQUE INDEX idx_landing_page_trials_email ON public.landing_page_trials (email);

ALTER TABLE public.landing_page_trials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access landing_page_trials"
ON public.landing_page_trials
FOR ALL
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);
