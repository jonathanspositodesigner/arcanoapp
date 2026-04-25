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
  permanent_balance integer,
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
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  _offset := GREATEST(0, (_page - 1) * _page_size);
  _safe_sort := CASE _sort_column
    WHEN 'monthly_balance' THEN 'monthly_balance'
    WHEN 'permanent_balance' THEN 'permanent_balance'
    WHEN 'last_transaction_at' THEN 'last_transaction_at'
    WHEN 'email' THEN 'email'
    ELSE 'total_balance'
  END;
  _safe_dir := CASE lower(_sort_direction) WHEN 'asc' THEN 'ASC' ELSE 'DESC' END;

  RETURN QUERY EXECUTE format($q$
    WITH all_uids AS (
      SELECT uc.user_id AS uid FROM public.upscaler_user_credits uc
      UNION
      SELECT t.user_id AS uid FROM public.upscaler_credit_transactions t
    ),
    merged AS (
      SELECT
        au.uid,
        COALESCE((SELECT uc.monthly_balance FROM public.upscaler_user_credits uc WHERE uc.user_id = au.uid), 0) AS monthly_balance,
        COALESCE((SELECT uc.permanent_balance FROM public.upscaler_user_credits uc WHERE uc.user_id = au.uid), 0) AS permanent_balance
      FROM all_uids au
    ),
    enriched AS (
      SELECT
        m.uid,
        p.email,
        p.name,
        p.phone,
        m.monthly_balance,
        m.permanent_balance,
        (m.monthly_balance + m.permanent_balance) AS total_balance,
        (SELECT MAX(t2.created_at) FROM public.upscaler_credit_transactions t2 WHERE t2.user_id = m.uid) AS last_transaction_at
      FROM merged m
      LEFT JOIN public.profiles p ON p.id = m.uid
    ),
    filtered AS (
      SELECT * FROM enriched e
      WHERE (%L::boolean = false OR e.total_balance > 0)
        AND (%L::text IS NULL OR %L::text = '' OR e.email ILIKE '%%' || %L || '%%' OR e.name ILIKE '%%' || %L || '%%' OR e.phone ILIKE '%%' || %L || '%%')
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
      f.permanent_balance,
      f.total_balance,
      f.last_transaction_at,
      (SELECT cnt FROM counted)
    FROM filtered f
    ORDER BY f.%I %s NULLS LAST, f.uid ASC
    LIMIT %L OFFSET %L
  $q$, _only_with_balance, _search, _search, _search, _search, _search, _safe_sort, _safe_dir, _page_size, _offset);
END;
$$;