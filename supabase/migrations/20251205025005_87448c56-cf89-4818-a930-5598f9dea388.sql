-- Drop existing restrictive SELECT policies
DROP POLICY IF EXISTS "Free prompts are public" ON admin_prompts;
DROP POLICY IF EXISTS "Premium users can view premium prompts" ON admin_prompts;

-- Create a single policy that allows everyone to view all prompts
-- The UI will handle access control (showing lock icons, restricting downloads)
CREATE POLICY "Anyone can view all prompts"
ON admin_prompts
FOR SELECT
USING (true);