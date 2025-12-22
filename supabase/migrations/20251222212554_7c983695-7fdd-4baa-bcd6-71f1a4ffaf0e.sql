-- Create a function to get aggregated prompt click counts
-- This replaces fetching all 295+ rows and counting in JavaScript
CREATE OR REPLACE FUNCTION public.get_prompt_click_counts()
RETURNS TABLE (prompt_id uuid, click_count bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT prompt_id, COUNT(*)::bigint as click_count
  FROM prompt_clicks
  GROUP BY prompt_id;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION public.get_prompt_click_counts() TO anon;
GRANT EXECUTE ON FUNCTION public.get_prompt_click_counts() TO authenticated;