-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view admin prompts" ON admin_prompts;

-- Allow free prompts to be publicly readable
CREATE POLICY "Free prompts are public" ON admin_prompts 
FOR SELECT USING (is_premium = false);

-- Allow premium users to view premium prompts
CREATE POLICY "Premium users can view premium prompts" ON admin_prompts 
FOR SELECT TO authenticated USING (is_premium = true AND is_premium());