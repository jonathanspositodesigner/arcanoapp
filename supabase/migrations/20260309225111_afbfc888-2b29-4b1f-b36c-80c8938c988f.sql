
CREATE OR REPLACE FUNCTION public.get_unified_dashboard_orders(_start timestamp with time zone, _end timestamp with time zone)
 RETURNS TABLE(id text, status text, amount numeric, net_amount numeric, payment_method text, created_at timestamp with time zone, paid_at timestamp with time zone, user_email text, product_title text, product_id text, utm_data jsonb, source_platform text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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
    o.utm_data::jsonb,
    'mercadopago'::text as source_platform
  FROM mp_orders o
  LEFT JOIN mp_products p ON p.id = o.product_id
  WHERE o.created_at >= _start AND o.created_at < _end

  UNION ALL

  SELECT
    sub.id, sub.status, sub.amount, sub.net_amount, sub.payment_method,
    sub.created_at, sub.paid_at, sub.user_email, sub.product_title,
    sub.product_id, sub.utm_data, sub.source_platform
  FROM (
    SELECT DISTINCT ON (COALESCE(w.greenn_contract_id, w.id::text))
      w.id::text,
      CASE 
        WHEN w.status IN ('paid', 'approved', 'PURCHASE_APPROVED', 'PURCHASE_COMPLETE') THEN 'paid'
        WHEN w.status IN ('refunded', 'chargeback', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK') THEN 'refunded'
        WHEN w.status IN ('waiting_payment', 'pending_payment', 'PURCHASE_DELAYED') THEN 'pending'
        ELSE w.status
      END::text as status,
      COALESCE(w.amount, 0)::numeric as amount,
      NULL::numeric as net_amount,
      w.payment_method::text,
      w.received_at::timestamptz as created_at,
      CASE WHEN w.status IN ('paid', 'approved', 'PURCHASE_APPROVED', 'PURCHASE_COMPLETE') THEN w.received_at ELSE NULL END::timestamptz as paid_at,
      w.email::text as user_email,
      COALESCE(w.product_name, 'Produto ' || w.platform)::text as product_title,
      w.product_id::text,
      CASE WHEN w.utm_source IS NOT NULL THEN jsonb_build_object('utm_source', w.utm_source) ELSE NULL END::jsonb as utm_data,
      w.platform::text as source_platform
    FROM webhook_logs w
    WHERE w.received_at >= _start AND w.received_at < _end
      AND w.result = 'success'
      AND w.status IN ('paid', 'approved', 'PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'refunded', 'chargeback', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'waiting_payment', 'pending_payment', 'PURCHASE_DELAYED')
    ORDER BY COALESCE(w.greenn_contract_id, w.id::text), w.received_at DESC
  ) sub

  ORDER BY created_at DESC;
END;
$function$;
