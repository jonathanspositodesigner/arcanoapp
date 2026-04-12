CREATE OR REPLACE FUNCTION public.get_unified_dashboard_orders(_start text, _end text)
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
  source_platform text,
  user_name text,
  whatsapp_welcome_sent boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  WITH stripe_orders_ranked AS (
    SELECT
      so.id::text AS id,
      so.status::text AS status,
      so.amount::numeric AS amount,
      so.net_amount::numeric AS net_amount,
      so.payment_method::text AS payment_method,
      so.created_at::timestamptz AS created_at,
      so.paid_at::timestamptz AS paid_at,
      so.user_email::text AS user_email,
      COALESCE(sp.title, 'Produto desconhecido')::text AS product_title,
      so.product_id::text AS product_id,
      so.utm_data::jsonb AS utm_data,
      'stripe'::text AS source_platform,
      so.user_name::text AS user_name,
      false AS whatsapp_welcome_sent,
      row_number() OVER (
        PARTITION BY COALESCE(NULLIF(so.stripe_payment_intent_id, ''), NULLIF(so.stripe_session_id, ''), so.id::text)
        ORDER BY COALESCE(so.paid_at, so.created_at) DESC, so.created_at DESC, so.id DESC
      ) AS stripe_row_rank
    FROM public.stripe_orders so
    LEFT JOIN public.mp_products sp ON sp.id = so.product_id
    WHERE so.created_at >= _start::timestamptz
      AND so.created_at < _end::timestamptz
      AND so.status IN ('paid', 'pending', 'refunded')
  ),
  combined AS (
    SELECT
      o.id::text AS id,
      o.status::text AS status,
      o.amount::numeric AS amount,
      o.net_amount::numeric AS net_amount,
      o.payment_method::text AS payment_method,
      o.created_at::timestamptz AS created_at,
      o.paid_at::timestamptz AS paid_at,
      o.user_email::text AS user_email,
      COALESCE(p.title, 'Produto desconhecido')::text AS product_title,
      o.product_id::text AS product_id,
      o.utm_data::jsonb AS utm_data,
      'mercadopago'::text AS source_platform,
      o.user_name::text AS user_name,
      false AS whatsapp_welcome_sent
    FROM public.mp_orders o
    LEFT JOIN public.mp_products p ON p.id = o.product_id
    WHERE o.created_at >= _start::timestamptz
      AND o.created_at < _end::timestamptz
      AND o.status IN ('paid', 'pending', 'refunded')

    UNION ALL

    SELECT
      ao.id::text AS id,
      ao.status::text AS status,
      ao.amount::numeric AS amount,
      ao.net_amount::numeric AS net_amount,
      ao.payment_method::text AS payment_method,
      ao.created_at::timestamptz AS created_at,
      ao.paid_at::timestamptz AS paid_at,
      ao.user_email::text AS user_email,
      COALESCE(ap.title, 'Produto desconhecido')::text AS product_title,
      ao.product_id::text AS product_id,
      ao.utm_data::jsonb AS utm_data,
      'pagarme'::text AS source_platform,
      ao.user_name::text AS user_name,
      COALESCE(ao.whatsapp_welcome_sent, false) AS whatsapp_welcome_sent
    FROM public.asaas_orders ao
    LEFT JOIN public.mp_products ap ON ap.id = ao.product_id
    WHERE ao.created_at >= _start::timestamptz
      AND ao.created_at < _end::timestamptz
      AND ao.status IN ('paid', 'pending', 'refunded')

    UNION ALL

    SELECT
      sor.id,
      sor.status,
      sor.amount,
      sor.net_amount,
      sor.payment_method,
      sor.created_at,
      sor.paid_at,
      sor.user_email,
      sor.product_title,
      sor.product_id,
      sor.utm_data,
      sor.source_platform,
      sor.user_name,
      sor.whatsapp_welcome_sent
    FROM stripe_orders_ranked sor
    WHERE sor.stripe_row_rank = 1

    UNION ALL

    SELECT
      wl.id::text AS id,
      CASE
        WHEN wl.status IN ('paid', 'approved', 'PURCHASE_APPROVED') THEN 'paid'
        WHEN wl.status IN ('refunded', 'chargeback', 'chargedback', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK') THEN 'refunded'
        WHEN wl.status IN ('waiting_payment', 'pending_payment', 'PURCHASE_DELAYED') THEN 'pending'
        ELSE 'other'
      END::text AS status,
      COALESCE(wl.amount_brl, wl.amount, 0)::numeric AS amount,
      NULL::numeric AS net_amount,
      wl.payment_method::text AS payment_method,
      wl.received_at::timestamptz AS created_at,
      CASE WHEN wl.status IN ('paid', 'approved', 'PURCHASE_APPROVED') THEN wl.received_at ELSE NULL END::timestamptz AS paid_at,
      wl.email::text AS user_email,
      COALESCE(wl.product_name, 'Produto ' || wl.platform)::text AS product_title,
      wl.product_id::text AS product_id,
      COALESCE(
        wl.utm_data,
        CASE WHEN wl.utm_source IS NOT NULL THEN jsonb_build_object('utm_source', wl.utm_source) ELSE NULL END
      )::jsonb AS utm_data,
      CASE
        WHEN wl.greenn_contract_id IS NOT NULL THEN 'greenn'
        WHEN wl.platform ILIKE '%hotmart%' OR wl.status LIKE 'PURCHASE_%' THEN 'hotmart'
        ELSE COALESCE(wl.platform, 'webhook')
      END::text AS source_platform,
      NULL::text AS user_name,
      false AS whatsapp_welcome_sent
    FROM public.webhook_logs wl
    WHERE wl.received_at >= _start::timestamptz
      AND wl.received_at < _end::timestamptz
      AND COALESCE(wl.amount_brl, wl.amount, 0) > 0
      AND wl.status NOT IN ('abandoned', 'canceled')
      AND COALESCE(lower(wl.platform), '') NOT IN ('pagarme', 'mercadopago', 'stripe')
      AND NOT EXISTS (
        SELECT 1
        FROM public.webhook_logs wl2
        WHERE wl2.greenn_contract_id = wl.greenn_contract_id
          AND wl.greenn_contract_id IS NOT NULL
          AND wl2.received_at < wl.received_at
          AND wl2.status = wl.status
      )
  )
  SELECT
    combined.id,
    combined.status,
    combined.amount,
    combined.net_amount,
    combined.payment_method,
    combined.created_at,
    combined.paid_at,
    combined.user_email,
    combined.product_title,
    combined.product_id,
    combined.utm_data,
    combined.source_platform,
    combined.user_name,
    combined.whatsapp_welcome_sent
  FROM combined
  ORDER BY combined.created_at DESC;
END;
$$;