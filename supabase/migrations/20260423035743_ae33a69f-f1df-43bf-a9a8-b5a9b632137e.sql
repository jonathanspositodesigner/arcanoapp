
-- 1. Config table for tool rates (extensible)
CREATE TABLE public.collaborator_tool_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_table TEXT NOT NULL UNIQUE,
  tool_display_name TEXT NOT NULL,
  earning_per_use NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.collaborator_tool_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tool rates"
ON public.collaborator_tool_rates FOR SELECT
USING (true);

-- Seed rates
INSERT INTO public.collaborator_tool_rates (tool_table, tool_display_name, earning_per_use) VALUES
  ('pose_changer_jobs', 'Pose Changer', 0.10),
  ('veste_ai_jobs', 'Veste AI', 0.10),
  ('arcano_cloner_jobs', 'Arcano Cloner', 0.16),
  ('movieled_maker_jobs', 'MovieLED Maker', 0.80),
  ('seedance_jobs', 'Seedance 2', 1.20);

-- 2. Earnings table for tool usage
CREATE TABLE public.collaborator_tool_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collaborator_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  job_id TEXT NOT NULL,
  tool_table TEXT NOT NULL,
  prompt_id TEXT NOT NULL,
  prompt_title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  earning_type TEXT NOT NULL DEFAULT 'tool_usage',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, tool_table)
);

ALTER TABLE public.collaborator_tool_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collaborators can view own tool earnings"
ON public.collaborator_tool_earnings FOR SELECT
TO authenticated
USING (
  collaborator_id IN (
    SELECT id FROM public.partners WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Service role full access to tool earnings"
ON public.collaborator_tool_earnings FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Add reference_prompt_id to tool tables that don't have it
ALTER TABLE public.pose_changer_jobs ADD COLUMN IF NOT EXISTS reference_prompt_id TEXT DEFAULT NULL;
ALTER TABLE public.veste_ai_jobs ADD COLUMN IF NOT EXISTS reference_prompt_id TEXT DEFAULT NULL;
ALTER TABLE public.arcano_cloner_jobs ADD COLUMN IF NOT EXISTS reference_prompt_id TEXT DEFAULT NULL;
ALTER TABLE public.seedance_jobs ADD COLUMN IF NOT EXISTS reference_prompt_id TEXT DEFAULT NULL;

-- 4. RPC to register tool usage earning
CREATE OR REPLACE FUNCTION public.register_collaborator_tool_earning(
  _job_id TEXT,
  _tool_table TEXT,
  _prompt_id TEXT,
  _user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _partner_id UUID;
  _prompt_title TEXT;
  _amount NUMERIC;
  _tool_name TEXT;
  _rows_affected INT;
BEGIN
  -- Get the rate for this tool
  SELECT earning_per_use, tool_display_name INTO _amount, _tool_name
  FROM collaborator_tool_rates
  WHERE tool_table = _tool_table AND is_active = true;
  
  IF _amount IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'tool_not_configured');
  END IF;
  
  -- Get prompt info and validate ownership
  SELECT pp.partner_id, pp.title INTO _partner_id, _prompt_title
  FROM partner_prompts pp
  JOIN partners p ON p.id = pp.partner_id
  WHERE pp.id::text = _prompt_id
    AND pp.approved = true
    AND p.is_active = true;
  
  IF _partner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_prompt_or_partner');
  END IF;
  
  -- Block self-earning (partner using their own prompt)
  IF _user_id IN (SELECT user_id FROM partners WHERE id = _partner_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_usage_blocked');
  END IF;
  
  -- Insert earning (unique constraint prevents duplicates)
  INSERT INTO collaborator_tool_earnings (collaborator_id, user_id, job_id, tool_table, prompt_id, prompt_title, amount)
  VALUES (_partner_id, _user_id, _job_id, _tool_table, _prompt_id, _prompt_title, _amount)
  ON CONFLICT (job_id, tool_table) DO NOTHING;
  
  GET DIAGNOSTICS _rows_affected = ROW_COUNT;
  
  IF _rows_affected > 0 THEN
    -- Update balance
    INSERT INTO collaborator_balances (collaborator_id, total_earned, total_unlocks)
    VALUES (_partner_id, _amount, 0)
    ON CONFLICT (collaborator_id) DO UPDATE
    SET total_earned = collaborator_balances.total_earned + _amount,
        updated_at = now();
    
    RETURN jsonb_build_object('success', true, 'amount', _amount, 'tool', _tool_name, 'partner_id', _partner_id);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'already_registered');
  END IF;
END;
$$;
