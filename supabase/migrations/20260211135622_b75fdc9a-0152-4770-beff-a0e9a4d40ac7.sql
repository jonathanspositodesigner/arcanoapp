
-- Add email_verified to profiles (existing users are verified by default)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;

-- Set all existing profiles as verified
UPDATE public.profiles SET email_verified = true WHERE email_verified = false;

-- Create email_confirmation_tokens table
CREATE TABLE public.email_confirmation_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast token lookup
CREATE INDEX idx_email_confirmation_tokens_token ON public.email_confirmation_tokens(token);
CREATE INDEX idx_email_confirmation_tokens_user_id ON public.email_confirmation_tokens(user_id);

-- RLS
ALTER TABLE public.email_confirmation_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can manage tokens (edge functions use service role)
CREATE POLICY "Service role full access on email_confirmation_tokens"
  ON public.email_confirmation_tokens
  FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);
