
-- Add currency and amount_brl columns to webhook_logs
ALTER TABLE public.webhook_logs ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'BRL';
ALTER TABLE public.webhook_logs ADD COLUMN IF NOT EXISTS amount_brl NUMERIC;

-- Fix historical data: set amount_brl for non-hotmart-es records (already BRL)
UPDATE public.webhook_logs 
SET currency = 'BRL', amount_brl = amount
WHERE platform != 'hotmart-es' AND amount IS NOT NULL AND amount > 0;

-- Fix hotmart-es records that still have payload with currency info
UPDATE public.webhook_logs
SET 
  currency = payload->'data'->'purchase'->'price'->>'currency_value',
  amount_brl = CASE 
    WHEN payload->'data'->'purchase'->'price'->>'currency_value' = 'BRL' THEN amount
    WHEN payload->'data'->'purchase'->'price'->>'currency_value' = 'COP' THEN ROUND(amount * 0.00122, 2)
    WHEN payload->'data'->'purchase'->'price'->>'currency_value' = 'ARS' THEN ROUND(amount * 0.0054, 2)
    WHEN payload->'data'->'purchase'->'price'->>'currency_value' = 'USD' THEN ROUND(amount * 5.70, 2)
    WHEN payload->'data'->'purchase'->'price'->>'currency_value' = 'MXN' THEN ROUND(amount * 0.28, 2)
    WHEN payload->'data'->'purchase'->'price'->>'currency_value' = 'PEN' THEN ROUND(amount * 1.52, 2)
    ELSE amount
  END
WHERE platform = 'hotmart-es' 
  AND amount IS NOT NULL AND amount > 0
  AND payload != '{}'::jsonb
  AND payload->'data'->'purchase'->'price'->>'currency_value' IS NOT NULL;

-- Fix hotmart-es records WITHOUT payload (cleared) - infer currency from amount + payment method
-- NEQUI = Colombia (COP), YAPE = Peru (PEN), MERCADO_PAGO in hotmart-es = Argentina (ARS)
-- Very high amounts (>1000) with CREDIT_CARD in hotmart-es = likely COP
UPDATE public.webhook_logs
SET 
  currency = CASE
    WHEN payment_method = 'NEQUI' THEN 'COP'
    WHEN payment_method = 'YAPE' THEN 'USD'
    WHEN payment_method = 'MERCADO_PAGO' AND amount > 1000 THEN 'ARS'
    WHEN payment_method = 'CREDIT_CARD' AND amount > 1000 THEN 'COP'
    WHEN amount < 200 THEN 'USD'
    ELSE 'COP'
  END,
  amount_brl = CASE
    WHEN payment_method = 'NEQUI' THEN ROUND(amount * 0.00122, 2)
    WHEN payment_method = 'YAPE' THEN ROUND(amount * 5.70, 2)
    WHEN payment_method = 'MERCADO_PAGO' AND amount > 1000 THEN ROUND(amount * 0.0054, 2)
    WHEN payment_method = 'CREDIT_CARD' AND amount > 1000 THEN ROUND(amount * 0.00122, 2)
    WHEN amount < 200 THEN ROUND(amount * 5.70, 2)
    ELSE ROUND(amount * 0.00122, 2)
  END
WHERE platform = 'hotmart-es'
  AND amount IS NOT NULL AND amount > 0
  AND (payload IS NULL OR payload = '{}'::jsonb OR payload->'data'->'purchase'->'price'->>'currency_value' IS NULL)
  AND amount_brl IS NULL;
