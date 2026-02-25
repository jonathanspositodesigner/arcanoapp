
-- Table to track which devices created accounts
CREATE TABLE public.device_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_fingerprint TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by fingerprint
CREATE INDEX idx_device_signups_fingerprint ON public.device_signups (device_fingerprint);

-- Enable RLS
ALTER TABLE public.device_signups ENABLE ROW LEVEL SECURITY;

-- No direct access via RLS - only through SECURITY DEFINER functions
-- Users should not be able to read/write this table directly

-- RPC to check if a device already signed up
CREATE OR REPLACE FUNCTION public.check_device_signup_limit(p_fingerprint TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM device_signups
    WHERE device_fingerprint = p_fingerprint
  );
END;
$$;

-- RPC to register a device signup (called after successful signup)
CREATE OR REPLACE FUNCTION public.register_device_signup(p_fingerprint TEXT, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO device_signups (device_fingerprint, user_id)
  VALUES (p_fingerprint, p_user_id)
  ON CONFLICT DO NOTHING;
END;
$$;
