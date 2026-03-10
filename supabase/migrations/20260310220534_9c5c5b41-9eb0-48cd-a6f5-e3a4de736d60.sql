
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
      COALESCE(p.title, 'Produto desconhecido')::text AS product_title,
      o.product_id::text,
      o.utm_data::jsonb,
      'mercadopago'::text AS source_platform
    FROM mp_orders o
    LEFT JOIN mp_products p ON p.id = o.product_id
    WHERE o.created_at >= _start AND o.created_at < _end
      AND o.status IN ('paid', 'pending', 'refunded')

    UNION ALL

    -- Pagar.me orders (previously labeled 'asaas')
    SELECT 
      ao.id::text,
      ao.status::text,
      ao.amount::numeric,
      ao.net_amount::numeric,
      ao.payment_method::text,
      ao.created_at::timestamptz,
      ao.paid_at::timestamptz,
      ao.user_email::text,
      COALESCE(ap.title, 'Produto desconhecido')::text AS product_title,
      ao.product_id::text,
      ao.utm_data::jsonb,
      'pagarme'::text AS source_platform
    FROM asaas_orders ao
    LEFT JOIN mp_products ap ON ap.id = ao.product_id
    WHERE ao.created_at >= _start AND ao.created_at < _end
      AND ao.status IN ('paid', 'pending', 'refunded')

    UNION ALL

    -- Greenn/Hotmart webhook orders
    SELECT
      wl.id::text,
      CASE 
        WHEN wl.status IN ('paid', 'approved', 'PURCHASE_APPROVED') THEN 'paid'
        WHEN wl.status IN ('refunded', 'chargeback', 'chargedback', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK') THEN 'refunded'
        WHEN wl.status IN ('waiting_payment', 'pending_payment', 'PURCHASE_DELAYED') THEN 'pending'
        ELSE 'other'
      END::text,
      COALESCE(wl.amount_brl, wl.amount, 0)::numeric,
      NULL::numeric,
      wl.payment_method::text,
      wl.received_at::timestamptz,
      CASE WHEN wl.status IN ('paid', 'approved', 'PURCHASE_APPROVED') THEN wl.received_at ELSE NULL END::timestamptz,
      wl.email::text,
      COALESCE(wl.product_name, 'Produto ' || wl.platform)::text,
      wl.product_id::text,
      COALESCE(
        wl.utm_data,
        CASE WHEN wl.utm_source IS NOT NULL THEN jsonb_build_object('utm_source', wl.utm_source) ELSE NULL END
      )::jsonb,
      CASE
        WHEN wl.greenn_contract_id IS NOT NULL THEN 'greenn'
        WHEN wl.platform ILIKE '%hotmart%' OR wl.status LIKE 'PURCHASE_%' THEN 'hotmart'
        ELSE COALESCE(wl.platform, 'webhook')
      END::text AS source_platform
    FROM webhook_logs wl
    WHERE wl.received_at >= _start AND wl.received_at < _end
      AND COALESCE(wl.amount_brl, wl.amount, 0) > 0
      AND wl.status NOT IN ('abandoned', 'canceled')
      AND NOT EXISTS (
        SELECT 1 FROM webhook_logs wl2
        WHERE wl2.greenn_contract_id = wl.greenn_contract_id
          AND wl.greenn_contract_id IS NOT NULL
          AND wl2.received_at < wl.received_at
          AND wl2.status = wl.status
      )
  ) combined
  ORDER BY combined.created_at DESC;
END;
$function$;
