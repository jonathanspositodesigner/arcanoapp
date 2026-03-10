
-- Create asaas_orders table (mirrors mp_orders structure)
CREATE TABLE public.asaas_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  product_id uuid REFERENCES public.mp_products(id),
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  asaas_payment_id text,
  asaas_customer_id text,
  payment_method text,
  net_amount numeric,
  paid_at timestamptz,
  user_id uuid,
  utm_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.asaas_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage asaas_orders"
ON public.asaas_orders
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service role needs insert/update access (edge functions use service role)
-- No additional policy needed since service role bypasses RLS

-- Update get_unified_dashboard_orders to include Asaas orders
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

    -- Asaas orders
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
      'asaas'::text AS source_platform
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
        ELSE 'greenn'
      END::text
    FROM (
      SELECT DISTINCT ON (COALESCE(wl2.greenn_contract_id, wl2.id::text))
        wl2.*
      FROM webhook_logs wl2
      WHERE wl2.received_at >= _start AND wl2.received_at < _end
        AND wl2.result = 'success'
        AND wl2.status IN (
          'paid', 'approved', 'PURCHASE_APPROVED',
          'refunded', 'chargeback', 'chargedback', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK',
          'waiting_payment', 'pending_payment', 'PURCHASE_DELAYED'
        )
        AND (wl2.amount IS NOT NULL AND wl2.amount > 0)
      ORDER BY COALESCE(wl2.greenn_contract_id, wl2.id::text), wl2.received_at DESC
    ) wl
  ) combined
  ORDER BY combined.created_at DESC;
END;
$function$;
