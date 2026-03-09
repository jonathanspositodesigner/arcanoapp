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
    COALESCE(p.title, 'Produto desconhecido')::text AS product_title,
    o.product_id::text,
    o.utm_data::jsonb,
    'mercadopago'::text AS source_platform
  FROM mp_orders o
  LEFT JOIN mp_products p ON p.id = o.product_id
  WHERE o.created_at >= _start AND o.created_at < _end
    AND o.status = 'paid'

  UNION ALL

  SELECT
    sub.sid, sub.sstatus, sub.samount, sub.snet_amount, sub.spayment_method,
    sub.screated_at, sub.spaid_at, sub.suser_email, sub.sproduct_title,
    sub.sproduct_id, sub.sutm_data, sub.ssource_platform
  FROM (
    SELECT DISTINCT ON (COALESCE(wl.greenn_contract_id, wl.id::text))
      wl.id::text AS sid,
      CASE 
        WHEN wl.status IN ('paid', 'approved', 'PURCHASE_APPROVED', 'PURCHASE_COMPLETE') THEN 'paid'
        WHEN wl.status IN ('refunded', 'chargeback', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK') THEN 'refunded'
        WHEN wl.status IN ('waiting_payment', 'pending_payment', 'PURCHASE_DELAYED') THEN 'pending'
        ELSE wl.status
      END::text AS sstatus,
      COALESCE(wl.amount, 0)::numeric AS samount,
      NULL::numeric AS snet_amount,
      wl.payment_method::text AS spayment_method,
      wl.received_at::timestamptz AS screated_at,
      CASE WHEN wl.status IN ('paid', 'approved', 'PURCHASE_APPROVED', 'PURCHASE_COMPLETE') THEN wl.received_at ELSE NULL END::timestamptz AS spaid_at,
      wl.email::text AS suser_email,
      COALESCE(wl.product_name, 'Produto ' || wl.platform)::text AS sproduct_title,
      wl.product_id::text AS sproduct_id,
      CASE WHEN wl.utm_source IS NOT NULL THEN jsonb_build_object('utm_source', wl.utm_source) ELSE NULL END::jsonb AS sutm_data,
      wl.platform::text AS ssource_platform
    FROM webhook_logs wl
    WHERE wl.received_at >= _start AND wl.received_at < _end
      AND wl.result = 'success'
      AND wl.status IN ('paid', 'approved', 'PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'refunded', 'chargeback', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'waiting_payment', 'pending_payment', 'PURCHASE_DELAYED')
    ORDER BY COALESCE(wl.greenn_contract_id, wl.id::text), wl.received_at DESC
  ) sub

  ORDER BY screated_at DESC;
END;
$function$;