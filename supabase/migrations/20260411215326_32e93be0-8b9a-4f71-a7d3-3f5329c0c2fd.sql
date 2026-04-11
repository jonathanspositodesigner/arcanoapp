
CREATE OR REPLACE FUNCTION public.get_receita_por_credito()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'receita_por_credito', COALESCE(SUM(COALESCE(sub.net, sub.amt)) / NULLIF(SUM(sub.creds), 0), 0),
    'total_receita', COALESCE(SUM(COALESCE(sub.net, sub.amt)), 0),
    'total_creditos', COALESCE(SUM(sub.creds), 0),
    'total_vendas', COUNT(*)
  )
  FROM (
    SELECT o.net_amount as net, o.amount as amt, p.credits_amount as creds
    FROM asaas_orders o
    JOIN mp_products p ON p.id = o.product_id AND p.credits_amount > 0
    WHERE o.status = 'paid'
    UNION ALL
    SELECT s.net_amount as net, s.amount as amt, p.credits_amount as creds
    FROM stripe_orders s
    JOIN mp_products p ON p.id = s.product_id AND p.credits_amount > 0
    WHERE s.status = 'paid'
  ) sub
$$;
