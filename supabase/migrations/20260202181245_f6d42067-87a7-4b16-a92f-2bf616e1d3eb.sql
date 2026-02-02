-- 1. Adicionar colunas monthly_balance e lifetime_balance na tabela upscaler_credits
ALTER TABLE upscaler_credits 
  ADD COLUMN IF NOT EXISTS monthly_balance INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_balance INTEGER NOT NULL DEFAULT 0;

-- 2. Migrar saldo atual para monthly_balance (usuários existentes)
UPDATE upscaler_credits 
SET monthly_balance = balance 
WHERE monthly_balance = 0 AND balance > 0;

-- 3. Adicionar coluna credit_type na tabela upscaler_credit_transactions
ALTER TABLE upscaler_credit_transactions 
  ADD COLUMN IF NOT EXISTS credit_type TEXT NOT NULL DEFAULT 'monthly';

-- 4. Atualizar função get_upscaler_credits para retornar soma dos dois saldos
CREATE OR REPLACE FUNCTION public.get_upscaler_credits(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT monthly_balance + lifetime_balance FROM upscaler_credits WHERE user_id = _user_id),
    0
  )
$function$;

-- 5. Nova função para retornar breakdown de créditos
CREATE OR REPLACE FUNCTION public.get_upscaler_credits_breakdown(_user_id uuid)
RETURNS TABLE(total integer, monthly integer, lifetime integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    COALESCE(monthly_balance + lifetime_balance, 0) as total,
    COALESCE(monthly_balance, 0) as monthly,
    COALESCE(lifetime_balance, 0) as lifetime
  FROM upscaler_credits 
  WHERE user_id = _user_id
  UNION ALL
  SELECT 0, 0, 0
  WHERE NOT EXISTS (SELECT 1 FROM upscaler_credits WHERE user_id = _user_id)
  LIMIT 1
$function$;

-- 6. Atualizar função consume_upscaler_credits - consome primeiro do monthly, depois do lifetime
CREATE OR REPLACE FUNCTION public.consume_upscaler_credits(_user_id uuid, _amount integer, _description text DEFAULT 'Upscaler usage'::text)
RETURNS TABLE(success boolean, new_balance integer, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_monthly INTEGER;
  current_lifetime INTEGER;
  total_balance INTEGER;
  monthly_to_consume INTEGER;
  lifetime_to_consume INTEGER;
  updated_monthly INTEGER;
  updated_lifetime INTEGER;
BEGIN
  -- Get current balances (or create if not exists)
  INSERT INTO upscaler_credits (user_id, balance, monthly_balance, lifetime_balance)
  VALUES (_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT monthly_balance, lifetime_balance INTO current_monthly, current_lifetime
  FROM upscaler_credits
  WHERE user_id = _user_id
  FOR UPDATE;
  
  total_balance := current_monthly + current_lifetime;
  
  IF total_balance < _amount THEN
    RETURN QUERY SELECT FALSE, total_balance, 'Saldo insuficiente'::TEXT;
    RETURN;
  END IF;
  
  -- Consume from monthly first, then lifetime
  IF current_monthly >= _amount THEN
    monthly_to_consume := _amount;
    lifetime_to_consume := 0;
  ELSE
    monthly_to_consume := current_monthly;
    lifetime_to_consume := _amount - current_monthly;
  END IF;
  
  updated_monthly := current_monthly - monthly_to_consume;
  updated_lifetime := current_lifetime - lifetime_to_consume;
  
  UPDATE upscaler_credits
  SET 
    monthly_balance = updated_monthly, 
    lifetime_balance = updated_lifetime,
    balance = updated_monthly + updated_lifetime,
    updated_at = now()
  WHERE user_id = _user_id;
  
  -- Log the transaction with credit_type info
  INSERT INTO upscaler_credit_transactions 
    (user_id, amount, balance_after, transaction_type, description, credit_type)
  VALUES 
    (_user_id, -_amount, updated_monthly + updated_lifetime, 'consumption', _description, 
     CASE WHEN lifetime_to_consume > 0 THEN 'mixed' ELSE 'monthly' END);
  
  RETURN QUERY SELECT TRUE, updated_monthly + updated_lifetime, NULL::TEXT;
END;
$function$;

-- 7. Atualizar função reset_upscaler_credits - reseta APENAS o monthly_balance
CREATE OR REPLACE FUNCTION public.reset_upscaler_credits(_user_id uuid, _amount integer, _description text DEFAULT 'Subscription credits reset'::text)
RETURNS TABLE(success boolean, new_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_lifetime INTEGER;
  updated_balance INTEGER;
BEGIN
  -- Get current lifetime balance or create record
  INSERT INTO upscaler_credits (user_id, balance, monthly_balance, lifetime_balance)
  VALUES (_user_id, _amount, _amount, 0)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    monthly_balance = _amount, 
    balance = _amount + upscaler_credits.lifetime_balance,
    updated_at = now()
  RETURNING monthly_balance + lifetime_balance INTO updated_balance;
  
  -- Log transaction
  INSERT INTO upscaler_credit_transactions 
    (user_id, amount, balance_after, transaction_type, description, credit_type)
  VALUES 
    (_user_id, _amount, updated_balance, 'reset', _description, 'monthly');
  
  RETURN QUERY SELECT TRUE, updated_balance;
END;
$function$;

-- 8. Atualizar função add_upscaler_credits para especificar que é monthly
CREATE OR REPLACE FUNCTION public.add_upscaler_credits(_user_id uuid, _amount integer, _description text DEFAULT 'Credit added'::text)
RETURNS TABLE(success boolean, new_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  updated_balance INTEGER;
BEGIN
  -- Insert or update monthly credits
  INSERT INTO upscaler_credits (user_id, balance, monthly_balance, lifetime_balance)
  VALUES (_user_id, _amount, _amount, 0)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    monthly_balance = upscaler_credits.monthly_balance + _amount,
    balance = upscaler_credits.monthly_balance + _amount + upscaler_credits.lifetime_balance,
    updated_at = now()
  RETURNING monthly_balance + lifetime_balance INTO updated_balance;
  
  INSERT INTO upscaler_credit_transactions 
    (user_id, amount, balance_after, transaction_type, description, credit_type)
  VALUES 
    (_user_id, _amount, updated_balance, 'credit', _description, 'monthly');
  
  RETURN QUERY SELECT TRUE, updated_balance;
END;
$function$;

-- 9. Nova função para adicionar créditos VITALÍCIOS
CREATE OR REPLACE FUNCTION public.add_lifetime_credits(_user_id uuid, _amount integer, _description text DEFAULT 'Lifetime credit added'::text)
RETURNS TABLE(success boolean, new_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  updated_balance INTEGER;
BEGIN
  -- Insert or update lifetime credits
  INSERT INTO upscaler_credits (user_id, balance, monthly_balance, lifetime_balance)
  VALUES (_user_id, _amount, 0, _amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    lifetime_balance = upscaler_credits.lifetime_balance + _amount,
    balance = upscaler_credits.monthly_balance + upscaler_credits.lifetime_balance + _amount,
    updated_at = now()
  RETURNING monthly_balance + lifetime_balance INTO updated_balance;
  
  INSERT INTO upscaler_credit_transactions 
    (user_id, amount, balance_after, transaction_type, description, credit_type)
  VALUES 
    (_user_id, _amount, updated_balance, 'credit', _description, 'lifetime');
  
  RETURN QUERY SELECT TRUE, updated_balance;
END;
$function$;