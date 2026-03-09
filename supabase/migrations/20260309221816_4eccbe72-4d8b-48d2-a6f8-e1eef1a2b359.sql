CREATE OR REPLACE FUNCTION public.get_unified_dashboard_orders(_start timestamptz, _end timestamptz)
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
  utm_data jsonb,
  source_platform text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Security check: only admins
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  -- Mercado Pago orders
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
    o.utm_data::jsonb,
    'mercadopago'::text as source_platform
  FROM mp_orders o
  LEFT JOIN mp_products p ON p.id = o.product_id
  WHERE o.created_at >= _start AND o.created_at < _end

  UNION ALL

  -- Greenn + Hotmart webhook sales (paid/approved only)
  SELECT
    w.id::text,
    CASE 
      WHEN w.status IN ('paid', 'approved', 'PURCHASE_APPROVED', 'PURCHASE_COMPLETE') THEN 'paid'
      WHEN w.status IN ('refunded', 'chargeback', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK') THEN 'refunded'
      WHEN w.status IN ('waiting_payment') THEN 'pending'
      ELSE w.status
    END::text,
    COALESCE(w.amount, 0)::numeric,
    NULL::numeric as net_amount,
    NULL::text as payment_method,
    w.received_at::timestamptz as created_at,
    CASE WHEN w.status IN ('paid', 'approved', 'PURCHASE_APPROVED', 'PURCHASE_COMPLETE') THEN w.received_at ELSE NULL END::timestamptz as paid_at,
    w.email::text as user_email,
    COALESCE(w.product_name, 'Produto ' || w.platform)::text as product_title,
    w.product_id::text,
    NULL::jsonb as utm_data,
    w.platform::text as source_platform
  FROM webhook_logs w
  WHERE w.received_at >= _start AND w.received_at < _end
    AND w.amount IS NOT NULL
    AND w.amount > 0
    AND w.result = 'success'
    AND w.status IN ('paid', 'approved', 'PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'refunded', 'chargeback', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK')

  ORDER BY created_at DESC;
END;
$$;