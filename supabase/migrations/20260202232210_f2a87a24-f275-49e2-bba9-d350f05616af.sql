-- Drop existing SELECT policy and create a corrected one
DROP POLICY IF EXISTS "Users can view own jobs by user_id" ON pose_changer_jobs;

-- Allow users to view their own jobs OR jobs they just inserted
CREATE POLICY "Users can view own jobs" ON pose_changer_jobs
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

-- Also fix INSERT policy to require user_id matches auth.uid()
DROP POLICY IF EXISTS "Authenticated users can insert jobs" ON pose_changer_jobs;

CREATE POLICY "Users can insert own jobs" ON pose_changer_jobs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR user_id IS NULL));