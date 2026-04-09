
-- Add veo3 trial tracking column
ALTER TABLE public.planos2_subscriptions
ADD COLUMN IF NOT EXISTS veo3_trial_started_at timestamptz DEFAULT NULL;

-- Update credits_per_month for unlimited plans to 14000
UPDATE public.planos2_subscriptions
SET credits_per_month = 14000
WHERE plan_slug = 'unlimited' AND is_active = true;

-- Create RPC to check if unlimited user is in veo3 free trial period
CREATE OR REPLACE FUNCTION public.check_veo3_unlimited_trial(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sub record;
  _trial_start timestamptz;
  _is_unlimited boolean := false;
  _in_trial boolean := false;
  _days_remaining integer := 0;
BEGIN
  -- Get active unlimited subscription
  SELECT * INTO _sub
  FROM planos2_subscriptions
  WHERE user_id = _user_id
    AND plan_slug = 'unlimited'
    AND is_active = true
  LIMIT 1;

  IF _sub IS NULL THEN
    RETURN jsonb_build_object(
      'is_unlimited', false,
      'in_trial', false,
      'days_remaining', 0
    );
  END IF;

  _is_unlimited := true;
  _trial_start := _sub.veo3_trial_started_at;

  -- If trial has been activated, check if still within 7 days
  IF _trial_start IS NOT NULL THEN
    IF now() < (_trial_start + interval '7 days') THEN
      _in_trial := true;
      _days_remaining := GREATEST(0, EXTRACT(DAY FROM (_trial_start + interval '7 days') - now())::integer);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'is_unlimited', _is_unlimited,
    'in_trial', _in_trial,
    'days_remaining', _days_remaining,
    'trial_started_at', _trial_start
  );
END;
$$;

-- Create RPC to check if user is unlimited (for edge functions to skip credits)
CREATE OR REPLACE FUNCTION public.is_unlimited_subscriber(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM planos2_subscriptions
    WHERE user_id = _user_id
      AND plan_slug = 'unlimited'
      AND is_active = true
  );
$$;
