
-- FIX 1: meta_ad_insights - remove permissive authenticated read (admin-only remains)
DROP POLICY IF EXISTS "Allow authenticated read meta_ad_insights" ON public.meta_ad_insights;
DROP POLICY IF EXISTS "Allow authenticated read meta_adset_insights" ON public.meta_adset_insights;

-- FIX 2: community_prompts - require authentication for INSERT
DROP POLICY IF EXISTS "Anyone can insert community prompts" ON public.community_prompts;
CREATE POLICY "Authenticated users can insert community prompts"
ON public.community_prompts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- FIX 3: community_artes - require authentication for INSERT
DROP POLICY IF EXISTS "Anyone can insert community artes" ON public.community_artes;
CREATE POLICY "Authenticated users can insert community artes"
ON public.community_artes
FOR INSERT
TO authenticated
WITH CHECK (true);
