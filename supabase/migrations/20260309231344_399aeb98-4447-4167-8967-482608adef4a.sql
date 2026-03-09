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
  SELECT * FROM (
    -- Mercado Pago orders (paid, pending, refunded)
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
      AND o.status IN ('paid', 'pending', 'refunded')

    UNION ALL

    -- Webhook logs (Greenn, Hotmart, etc) - latest entry per contract
    SELECT
      wl.id::text,
      CASE 
        WHEN wl.status IN ('paid', 'approved', 'PURCHASE_APPROVED', 'PURCHASE_COMPLETE') THEN 'paid'
        WHEN wl.status IN ('refunded', 'chargeback', 'chargedback', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK') THEN 'refunded'
        WHEN wl.status IN ('waiting_payment', 'pending_payment', 'PURCHASE_DELAYED') THEN 'pending'
        ELSE 'other'
      END::text,
      COALESCE(wl.amount, 0)::numeric,
      NULL::numeric,
      wl.payment_method::text,
      wl.received_at::timestamptz,
      CASE WHEN wl.status IN ('paid', 'approved', 'PURCHASE_APPROVED', 'PURCHASE_COMPLETE') THEN wl.received_at ELSE NULL END::timestamptz,
      wl.email::text,
      COALESCE(wl.product_name, 'Produto ' || wl.platform)::text,
      wl.product_id::text,
      CASE WHEN wl.utm_source IS NOT NULL THEN jsonb_build_object('utm_source', wl.utm_source) ELSE NULL END::jsonb,
      wl.platform::text
    FROM (
      SELECT DISTINCT ON (COALESCE(wl2.greenn_contract_id, wl2.id::text))
        wl2.*
      FROM webhook_logs wl2
      WHERE wl2.received_at >= _start AND wl2.received_at < _end
        AND wl2.result = 'success'
        AND wl2.status IN (
          'paid', 'approved', 'PURCHASE_APPROVED', 'PURCHASE_COMPLETE',
          'refunded', 'chargeback', 'chargedback', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK',
          'waiting_payment', 'pending_payment', 'PURCHASE_DELAYED'
        )
      ORDER BY COALESCE(wl2.greenn_contract_id, wl2.id::text), wl2.received_at DESC
    ) wl
  ) combined
  ORDER BY combined.created_at DESC;
END;
$function$;