
-- Table to cache exchange rates (all currencies → BRL)
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  currency TEXT PRIMARY KEY,
  rate_to_brl NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS needed - only accessed via service role from edge functions/RPCs
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Allow read from authenticated (for dashboard display if needed)
CREATE POLICY "Anyone can read exchange rates" ON public.exchange_rates FOR SELECT USING (true);

-- DB function to convert any currency to BRL using cached rates
CREATE OR REPLACE FUNCTION public.convert_to_brl(_amount NUMERIC, _currency TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  IF _currency IS NULL OR _currency = 'BRL' THEN
    RETURN _amount;
  END IF;
  
  SELECT rate_to_brl INTO v_rate FROM exchange_rates WHERE currency = _currency;
  
  IF v_rate IS NULL THEN
    -- Fallback hardcoded rates
    v_rate := CASE _currency
      WHEN 'USD' THEN 5.70
      WHEN 'COP' THEN 0.00122
      WHEN 'ARS' THEN 0.0054
      WHEN 'MXN' THEN 0.28
      WHEN 'PEN' THEN 1.52
      WHEN 'CLP' THEN 0.006
      WHEN 'EUR' THEN 6.20
      WHEN 'GBP' THEN 7.20
      ELSE 1
    END;
  END IF;
  
  RETURN ROUND(_amount * v_rate, 2);
END;
$$;

-- Function to recalculate all webhook_logs amount_brl using latest rates
CREATE OR REPLACE FUNCTION public.recalculate_webhook_amounts_brl()
RETURNS TABLE(updated_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE webhook_logs wl
  SET amount_brl = convert_to_brl(wl.amount, wl.currency)
  WHERE wl.currency IS NOT NULL 
    AND wl.currency != 'BRL'
    AND wl.amount IS NOT NULL 
    AND wl.amount > 0;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count;
END;
$$;
