
-- Add new columns to mp_orders for dashboard analytics
ALTER TABLE mp_orders ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE mp_orders ADD COLUMN IF NOT EXISTS net_amount numeric;
ALTER TABLE mp_orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Create admin RPC to fetch dashboard orders
CREATE OR REPLACE FUNCTION get_mp_dashboard_orders(_start timestamptz, _end timestamptz)
RETURNS TABLE(
  id text,
  status text,
  amount numeric,
  net_amount numeric,
  payment_method text,
  created_at timestamptz,
  paid_at timestamptz,
  user_email text,
  product_title text,
  product_id text,
  utm_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check: only admins
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    o.id::text,
    o.status::text,
    o.amount::numeric,
    o.net_amount::numeric,
    o.payment_method::text,
    o.created_at::timestamptz,
    o.paid_at::timestamptz,
    o.user_email::text,
    COALESCE(p.title, 'Produto desconhecido')::text as product_title,
    o.product_id::text,
    o.utm_data::jsonb
  FROM mp_orders o
  LEFT JOIN mp_products p ON p.id = o.product_id
  WHERE o.created_at >= _start
    AND o.created_at < _end
  ORDER BY o.created_at DESC;
END;
$$;
