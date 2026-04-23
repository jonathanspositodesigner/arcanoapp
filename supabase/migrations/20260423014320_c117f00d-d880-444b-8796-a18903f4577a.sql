
-- Add profile fields to partners table
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS avatar_url text;

-- Auto-set is_premium = true when partner prompt is approved
CREATE OR REPLACE FUNCTION public.auto_set_partner_prompt_premium()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approved = true AND (OLD.approved IS NULL OR OLD.approved = false) THEN
    NEW.is_premium := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_set_partner_prompt_premium ON public.partner_prompts;
CREATE TRIGGER trg_auto_set_partner_prompt_premium
  BEFORE UPDATE ON public.partner_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_partner_prompt_premium();

-- Allow partners to update their own profile
CREATE POLICY "Partners can update own profile"
ON public.partners
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
