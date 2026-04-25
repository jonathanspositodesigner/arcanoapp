DROP FUNCTION IF EXISTS public.get_all_credit_users_v2(text, text, text, integer, integer, boolean);

CREATE OR REPLACE FUNCTION public.get_all_credit_users_v2(
  _search text DEFAULT NULL,
  _sort_column text DEFAULT 'total_balance',
  _sort_direction text DEFAULT 'desc',
  _page integer DEFAULT 1,
  _page_size integer DEFAULT 20,
  _only_with_balance boolean DEFAULT false
)
RETURNS TABLE(
  user_id uuid,
  email text,
  name text,
  phone text,
  monthly_balance integer,
  lifetime_balance integer,
  total_balance integer,
  last_transaction_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _offset integer;
  _safe_sort text;
  _safe_dir text;
  _safe_page_size integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  _safe_page_size := LEAST(GREATEST(COALESCE(_page_size, 20), 1), 100);
  _offset := GREATEST(0, (GREATEST(COALESCE(_page, 1), 1) - 1) * _safe_page_size);
  _safe_sort := CASE _sort_column
    WHEN 'name' THEN 'name'
    WHEN 'email' THEN 'email'
    WHEN 'monthly_balance' THEN 'monthly_balance'
    WHEN 'lifetime_balance' THEN 'lifetime_balance'
    ELSE 'total_balance'
  END;
  _safe_dir := CASE lower(COALESCE(_sort_direction, 'desc')) WHEN 'asc' THEN 'ASC' ELSE 'DESC' END;

  RETURN QUERY EXECUTE format($q$
    WITH enriched AS (
      SELECT
        uc.user_id AS uid,
        p.email,
        p.name,
        p.phone,
        uc.monthly_balance::integer AS monthly_balance,
        uc.lifetime_balance::integer AS lifetime_balance,
        (uc.monthly_balance + uc.lifetime_balance)::integer AS total_balance,
        uc.updated_at AS last_transaction_at
      FROM public.upscaler_credits uc
      LEFT JOIN public.profiles p ON p.id = uc.user_id
    ),
    filtered AS (
      SELECT * FROM enriched e
      WHERE (%L::boolean = false OR e.total_balance > 0)
        AND (
          NULLIF(%L::text, '') IS NULL
          OR COALESCE(e.email, '') ILIKE '%%' || %L || '%%'
          OR COALESCE(e.name, '') ILIKE '%%' || %L || '%%'
          OR COALESCE(e.phone, '') ILIKE '%%' || %L || '%%'
        )
    ),
    counted AS (
      SELECT COUNT(*) AS cnt FROM filtered
    )
    SELECT
      f.uid,
      f.email,
      f.name,
      f.phone,
      f.monthly_balance,
      f.lifetime_balance,
      f.total_balance,
      f.last_transaction_at,
      (SELECT cnt FROM counted)
    FROM filtered f
    ORDER BY f.%I %s NULLS LAST, f.uid ASC
    LIMIT %L OFFSET %L
  $q$, _only_with_balance, _search, _search, _search, _search, _safe_sort, _safe_dir, _safe_page_size, _offset);
END;
$$;