
-- Table to track one-time free trial bonus per email
CREATE TABLE public.arcano_cloner_free_trials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  credits_granted integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.arcano_cloner_free_trials ENABLE ROW LEVEL SECURITY;

-- Only service_role and admins can access
CREATE POLICY "Service role full access" 
ON public.arcano_cloner_free_trials 
FOR ALL 
USING (auth.role() = 'service_role'::text);

CREATE POLICY "Admins can manage free trials" 
ON public.arcano_cloner_free_trials 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
