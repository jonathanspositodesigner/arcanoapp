
-- Create stripe_orders table
CREATE TABLE public.stripe_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_session_id text,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending',
  amount numeric NOT NULL,
  amount_usd numeric,
  net_amount numeric,
  currency text NOT NULL DEFAULT 'usd',
  payment_method text,
  user_email text,
  user_name text,
  product_slug text,
  product_id uuid REFERENCES mp_products(id),
  user_id uuid,
  utm_data jsonb,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.stripe_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage stripe_orders"
  ON public.stripe_orders
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Index for idempotency
CREATE UNIQUE INDEX idx_stripe_orders_session_id ON public.stripe_orders(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

-- Update unified dashboard RPC to include stripe_orders
CREATE OR REPLACE FUNCTION public.get_unified_dashboard_orders(_start timestamptz, _end timestamptz)
RETURNS TABLE(id text, status text, amount numeric, net_amount numeric, payment_method text, created_at timestamptz, paid_at timestamptz, user_email text, product_title text, product_id text, utm_data jsonb, source_platform text, user_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT * FROM (
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
      'mercadopago'::text AS source_platform,
      o.user_name::text
    FROM mp_orders o
    LEFT JOIN mp_products p ON p.id = o.product_id
    WHERE o.created_at >= _start AND o.created_at < _end
      AND o.status IN ('paid', 'pending', 'refunded')

    UNION ALL

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
      'pagarme'::text AS source_platform,
      ao.user_name::text
    FROM asaas_orders ao
    LEFT JOIN mp_products ap ON ap.id = ao.product_id
    WHERE ao.created_at >= _start AND ao.created_at < _end
      AND ao.status IN ('paid', 'pending', 'refunded')

    UNION ALL

    -- STRIPE ORDERS
    SELECT
      so.id::text,
      so.status::text,
      so.amount::numeric,
      so.net_amount::numeric,
      so.payment_method::text,
      so.created_at::timestamptz,
      so.paid_at::timestamptz,
      so.user_email::text,
      COALESCE(sp.title, 'Produto desconhecido')::text AS product_title,
      so.product_id::text,
      so.utm_data::jsonb,
      'stripe'::text AS source_platform,
      so.user_name::text
    FROM stripe_orders so
    LEFT JOIN mp_products sp ON sp.id = so.product_id
    WHERE so.created_at >= _start AND so.created_at < _end
      AND so.status IN ('paid', 'pending', 'refunded')

    UNION ALL

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
      END::text AS source_platform,
      NULL::text AS user_name
    FROM webhook_logs wl
    WHERE wl.received_at >= _start AND wl.received_at < _end
      AND COALESCE(wl.amount_brl, wl.amount, 0) > 0
      AND wl.status NOT IN ('abandoned', 'canceled')
      AND COALESCE(lower(wl.platform), '') NOT IN ('pagarme', 'mercadopago')
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
