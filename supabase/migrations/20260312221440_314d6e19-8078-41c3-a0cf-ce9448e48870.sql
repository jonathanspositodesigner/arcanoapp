
-- Table for logging all Meta CAPI events
CREATE TABLE public.meta_capi_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  email text,
  value numeric,
  currency text DEFAULT 'BRL',
  event_id text,
  fbp text,
  fbc text,
  client_ip_address text,
  client_user_agent text,
  utm_data jsonb,
  event_source_url text,
  meta_response_status integer,
  meta_response_body text,
  success boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.meta_capi_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view meta_capi_logs"
ON public.meta_capi_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert meta_capi_logs"
ON public.meta_capi_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- Add meta tracking columns to asaas_orders
ALTER TABLE public.asaas_orders 
  ADD COLUMN IF NOT EXISTS meta_fbp text,
  ADD COLUMN IF NOT EXISTS meta_fbc text,
  ADD COLUMN IF NOT EXISTS meta_user_agent text;
