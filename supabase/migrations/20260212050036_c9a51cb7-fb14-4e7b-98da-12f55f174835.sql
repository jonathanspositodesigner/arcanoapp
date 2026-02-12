
CREATE TABLE public.google_api_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  total_budget NUMERIC NOT NULL DEFAULT 1900.00,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.google_api_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read google_api_config"
ON public.google_api_config
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update google_api_config"
ON public.google_api_config
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.google_api_config (id, total_budget) VALUES ('default', 1900.00);
