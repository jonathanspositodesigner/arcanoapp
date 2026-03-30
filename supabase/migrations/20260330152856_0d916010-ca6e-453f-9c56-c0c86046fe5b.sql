
-- =====================================================
-- FIX 1: veste_ai_jobs — broken RLS (session_id IS NOT NULL always true)
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own jobs" ON public.veste_ai_jobs;

CREATE POLICY "Users can view their own jobs"
  ON public.veste_ai_jobs FOR SELECT
  USING (user_id = auth.uid());

-- =====================================================
-- FIX 2: rate_limits — public role instead of service_role
-- =====================================================
DROP POLICY IF EXISTS "Service role full access" ON public.rate_limits;

CREATE POLICY "Service role full access"
  ON public.rate_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- FIX 3: pose_changer_jobs — public UPDATE policy
-- =====================================================
DROP POLICY IF EXISTS "Service role can update all jobs" ON public.pose_changer_jobs;

CREATE POLICY "Service role can update all jobs"
  ON public.pose_changer_jobs FOR UPDATE
  TO service_role
  USING (true);

-- =====================================================
-- FIX 4: upscaler_jobs — fully public (all operations)
-- =====================================================
DROP POLICY IF EXISTS "Anyone can insert jobs" ON public.upscaler_jobs;
DROP POLICY IF EXISTS "Anyone can view jobs" ON public.upscaler_jobs;
DROP POLICY IF EXISTS "Anyone can update jobs" ON public.upscaler_jobs;
DROP POLICY IF EXISTS "Anyone can delete jobs" ON public.upscaler_jobs;

-- Users can view their own jobs (or anonymous trial jobs with no user_id)
CREATE POLICY "Users can view own jobs"
  ON public.upscaler_jobs FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all jobs
CREATE POLICY "Admins can view all upscaler_jobs"
  ON public.upscaler_jobs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can insert their own jobs
CREATE POLICY "Users can insert own jobs"
  ON public.upscaler_jobs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR user_id IS NULL));

-- Users can update their own jobs (for client-side status tracking)
CREATE POLICY "Users can update own jobs"
  ON public.upscaler_jobs FOR UPDATE
  USING (user_id = auth.uid());

-- Service role can update all jobs (for webhook processing)
CREATE POLICY "Service role can update all upscaler_jobs"
  ON public.upscaler_jobs FOR UPDATE
  TO service_role
  USING (true);

-- Users can delete their own jobs
CREATE POLICY "Users can delete own jobs"
  ON public.upscaler_jobs FOR DELETE
  USING (user_id = auth.uid());
