CREATE OR REPLACE FUNCTION public.get_arte_click_counts()
RETURNS TABLE(arte_id text, click_count bigint)
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  SELECT arte_id, COUNT(*)::bigint as click_count
  FROM arte_clicks
  GROUP BY arte_id;
$$;