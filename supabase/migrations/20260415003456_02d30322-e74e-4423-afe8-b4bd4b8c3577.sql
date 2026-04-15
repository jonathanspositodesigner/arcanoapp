
-- =====================================================
-- FIX: Prevent users from modifying financial/sensitive columns on AI job tables
-- This closes a credit bypass vulnerability where users could set credits_charged=0
-- =====================================================

-- 1. Create a trigger function that blocks non-service-role from modifying sensitive columns
CREATE OR REPLACE FUNCTION public.protect_ai_job_financial_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role to do anything
  IF current_setting('role', true) = 'service_role' 
     OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Block changes to financial/sensitive columns
  IF OLD.credits_charged IS DISTINCT FROM NEW.credits_charged THEN
    RAISE EXCEPTION 'Cannot modify credits_charged';
  END IF;

  IF OLD.credits_refunded IS DISTINCT FROM NEW.credits_refunded THEN
    RAISE EXCEPTION 'Cannot modify credits_refunded';
  END IF;

  IF OLD.output_url IS DISTINCT FROM NEW.output_url THEN
    RAISE EXCEPTION 'Cannot modify output_url';
  END IF;

  IF OLD.task_id IS DISTINCT FROM NEW.task_id THEN
    RAISE EXCEPTION 'Cannot modify task_id';
  END IF;

  IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'Cannot modify user_id';
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Apply trigger to all vulnerable tables

-- seedance_jobs
CREATE TRIGGER protect_seedance_financial
  BEFORE UPDATE ON public.seedance_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_ai_job_financial_columns();

-- upscaler_jobs
CREATE TRIGGER protect_upscaler_financial
  BEFORE UPDATE ON public.upscaler_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_ai_job_financial_columns();

-- bg_remover_jobs
CREATE TRIGGER protect_bg_remover_financial
  BEFORE UPDATE ON public.bg_remover_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_ai_job_financial_columns();

-- veste_ai_jobs
CREATE TRIGGER protect_veste_ai_financial
  BEFORE UPDATE ON public.veste_ai_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_ai_job_financial_columns();

-- arcano_cloner_jobs
CREATE TRIGGER protect_arcano_cloner_financial
  BEFORE UPDATE ON public.arcano_cloner_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_ai_job_financial_columns();

-- image_generator_jobs
CREATE TRIGGER protect_image_generator_financial
  BEFORE UPDATE ON public.image_generator_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_ai_job_financial_columns();

-- pose_changer_jobs
CREATE TRIGGER protect_pose_changer_financial
  BEFORE UPDATE ON public.pose_changer_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_ai_job_financial_columns();

-- character_generator_jobs
CREATE TRIGGER protect_character_generator_financial
  BEFORE UPDATE ON public.character_generator_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_ai_job_financial_columns();

-- flyer_maker_jobs
CREATE TRIGGER protect_flyer_maker_financial
  BEFORE UPDATE ON public.flyer_maker_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_ai_job_financial_columns();

-- video_upscaler_jobs
CREATE TRIGGER protect_video_upscaler_financial
  BEFORE UPDATE ON public.video_upscaler_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_ai_job_financial_columns();

-- 3. Replace overly permissive seedance_jobs ALL policy with separate policies
DROP POLICY IF EXISTS "users_own_seedance_jobs" ON public.seedance_jobs;

CREATE POLICY "users_select_own_seedance_jobs"
  ON public.seedance_jobs FOR SELECT
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_seedance_jobs"
  ON public.seedance_jobs FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_seedance_jobs"
  ON public.seedance_jobs FOR UPDATE
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Remove unnecessary user UPDATE policies on tables that don't need client-side updates
-- (upscaler_jobs client never updates, bg_remover_jobs client never updates, veste_ai_jobs client never updates)
-- Keep them but the trigger protects financial columns
