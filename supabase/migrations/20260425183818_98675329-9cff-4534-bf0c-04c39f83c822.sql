-- Nova versão paginada que inclui também quem já teve créditos um dia (tem transações)
-- Antes: limitava ao saldo > 0 e era truncada em 1000 linhas pelo client.
-- Agora: paginação + busca server-side, e considera histórico de transações.

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
  monthly_balance integer,
  lifetime_balance integer,
  total_balance integer,
  has_history boolean,
  updated_at timestamp with time zone,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _offset integer;
  _total bigint;
BEGIN
  -- Security check
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  _offset := GREATEST(0, (_page - 1) * _page_size);

  -- Universo: união de quem tem saldo OU já teve transação (histórico)
  RETURN QUERY
  WITH base AS (
    SELECT
      u.user_id,
      COALESCE(uc.monthly_balance, 0) AS monthly_balance,
      COALESCE(uc.lifetime_balance, 0) AS lifetime_balance,
      COALESCE(uc.monthly_balance, 0) + COALESCE(uc.lifetime_balance, 0) AS total_balance,
      COALESCE(uc.updated_at, p.created_at) AS updated_at,
      EXISTS(SELECT 1 FROM upscaler_credit_transactions t WHERE t.user_id = u.user_id) AS has_history,
      COALESCE(p.email, 'N/A') AS email,
      COALESCE(p.name, 'N/A') AS name
    FROM (
      SELECT user_id FROM upscaler_credits
      UNION
      SELECT DISTINCT user_id FROM upscaler_credit_transactions
    ) u
    LEFT JOIN upscaler_credits uc ON uc.user_id = u.user_id
    LEFT JOIN profiles p ON p.id = u.user_id
  ),
  filtered AS (
    SELECT * FROM base
    WHERE
      (_only_with_balance = false OR total_balance > 0)
      AND (
        _search IS NULL OR _search = ''
        OR email ILIKE '%' || _search || '%'
        OR name  ILIKE '%' || _search || '%'
      )
  ),
  counted AS (
    SELECT COUNT(*) AS c FROM filtered
  )
  SELECT
    f.user_id,
    f.email,
    f.name,
    f.monthly_balance,
    f.lifetime_balance,
    f.total_balance,
    f.has_history,
    f.updated_at,
    (SELECT c FROM counted) AS total_count
  FROM filtered f
  ORDER BY
    CASE WHEN _sort_column = 'total_balance'    AND _sort_direction = 'desc' THEN f.total_balance    END DESC NULLS LAST,
    CASE WHEN _sort_column = 'total_balance'    AND _sort_direction = 'asc'  THEN f.total_balance    END ASC  NULLS LAST,
    CASE WHEN _sort_column = 'monthly_balance'  AND _sort_direction = 'desc' THEN f.monthly_balance  END DESC NULLS LAST,
    CASE WHEN _sort_column = 'monthly_balance'  AND _sort_direction = 'asc'  THEN f.monthly_balance  END ASC  NULLS LAST,
    CASE WHEN _sort_column = 'lifetime_balance' AND _sort_direction = 'desc' THEN f.lifetime_balance END DESC NULLS LAST,
    CASE WHEN _sort_column = 'lifetime_balance' AND _sort_direction = 'asc'  THEN f.lifetime_balance END ASC  NULLS LAST,
    CASE WHEN _sort_column = 'name'             AND _sort_direction = 'asc'  THEN LOWER(f.name)      END ASC,
    CASE WHEN _sort_column = 'name'             AND _sort_direction = 'desc' THEN LOWER(f.name)      END DESC,
    CASE WHEN _sort_column = 'email'            AND _sort_direction = 'asc'  THEN LOWER(f.email)     END ASC,
    CASE WHEN _sort_column = 'email'            AND _sort_direction = 'desc' THEN LOWER(f.email)     END DESC,
    f.user_id ASC
  LIMIT _page_size
  OFFSET _offset;
END;
$function$;

-- Função leve para cards de totais (não paginada)
CREATE OR REPLACE FUNCTION public.get_credit_users_totals()
RETURNS TABLE(
  total_users bigint,
  total_users_with_balance bigint,
  total_monthly bigint,
  total_lifetime bigint,
  total_credits bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  WITH universe AS (
    SELECT user_id FROM upscaler_credits
    UNION
    SELECT DISTINCT user_id FROM upscaler_credit_transactions
  ),
  joined AS (
    SELECT u.user_id,
           COALESCE(uc.monthly_balance, 0)  AS m,
           COALESCE(uc.lifetime_balance, 0) AS l
    FROM universe u
    LEFT JOIN upscaler_credits uc ON uc.user_id = u.user_id
  )
  SELECT
    (SELECT COUNT(*) FROM joined)::bigint AS total_users,
    (SELECT COUNT(*) FROM joined WHERE m + l > 0)::bigint AS total_users_with_balance,
    COALESCE(SUM(m), 0)::bigint AS total_monthly,
    COALESCE(SUM(l), 0)::bigint AS total_lifetime,
    COALESCE(SUM(m + l), 0)::bigint AS total_credits
  FROM joined;
END;
$function$;