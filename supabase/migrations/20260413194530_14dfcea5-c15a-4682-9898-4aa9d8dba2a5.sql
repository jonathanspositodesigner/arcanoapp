
-- =============================================
-- FIX BUG 11: prompt_likes - restrict SELECT to own likes only
-- Aggregated counts can use a DB function if needed
-- =============================================
DROP POLICY IF EXISTS "Anyone can view likes" ON public.prompt_likes;

-- Users can see their own likes (to know if they liked something)
CREATE POLICY "Users can view own likes"
ON public.prompt_likes
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can see all likes
CREATE POLICY "Admins can view all likes"
ON public.prompt_likes
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- FIX BUG 12: pose_changer_jobs - remove NULL user_id leak
-- =============================================
DROP POLICY IF EXISTS "Users can view own jobs" ON public.pose_changer_jobs;
CREATE POLICY "Users can view own jobs"
ON public.pose_changer_jobs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own jobs" ON public.pose_changer_jobs;
CREATE POLICY "Users can insert own jobs"
ON public.pose_changer_jobs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- =============================================
-- FIX BUG 12: video_upscaler_jobs - remove NULL user_id leak
-- =============================================
DROP POLICY IF EXISTS "Users can view their own jobs" ON public.video_upscaler_jobs;
CREATE POLICY "Users can view their own jobs"
ON public.video_upscaler_jobs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own jobs" ON public.video_upscaler_jobs;
CREATE POLICY "Users can insert their own jobs"
ON public.video_upscaler_jobs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- =============================================
-- FIX BUG 9: Add explicit service_role policies for tables with RLS but no policies
-- This documents intent and eliminates linter warnings
-- =============================================

-- device_signups: only service_role (signup flow via RPC)
CREATE POLICY "Service role full access on device_signups"
ON public.device_signups
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- job_notification_tokens: only service_role (edge function notifications)
CREATE POLICY "Service role full access on job_notification_tokens"
ON public.job_notification_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Users can read their own notification tokens
CREATE POLICY "Users can view own notification tokens"
ON public.job_notification_tokens
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- landing_cloner_trials: only service_role (trial management)
CREATE POLICY "Service role full access on landing_cloner_trials"
ON public.landing_cloner_trials
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- mp_orders: only service_role (payment processing)
CREATE POLICY "Service role full access on mp_orders"
ON public.mp_orders
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- mp_products: readable by all authenticated (needed for checkout config), writable by service_role
CREATE POLICY "Authenticated can read products"
ON public.mp_products
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role full access on mp_products"
ON public.mp_products
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
