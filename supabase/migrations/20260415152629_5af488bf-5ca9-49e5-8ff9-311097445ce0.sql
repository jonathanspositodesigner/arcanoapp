
-- Tabela de créditos de teste exclusivos do Flyer Maker
CREATE TABLE public.flyer_maker_test_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  granted_amount INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS habilitado mas sem policies públicas (só service role acessa)
ALTER TABLE public.flyer_maker_test_credits ENABLE ROW LEVEL SECURITY;

-- Policy para usuários autenticados lerem seus próprios créditos de teste
CREATE POLICY "Users can view own test credits"
  ON public.flyer_maker_test_credits
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Função para consultar saldo de créditos de teste
CREATE OR REPLACE FUNCTION public.get_flyer_test_credits(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT balance FROM flyer_maker_test_credits WHERE user_id = _user_id),
    0
  );
$$;

-- Função para consumir créditos de teste (parcial ou total)
-- Retorna: test_used (quanto consumiu de teste) e remaining (quanto falta cobrar dos normais)
CREATE OR REPLACE FUNCTION public.consume_flyer_test_credits(_user_id UUID, _amount INTEGER)
RETURNS TABLE(test_used INTEGER, remaining INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
  to_consume INTEGER;
  leftover INTEGER;
BEGIN
  -- Pegar saldo atual com lock
  SELECT balance INTO current_balance
  FROM flyer_maker_test_credits
  WHERE user_id = _user_id
  FOR UPDATE;

  -- Se não tem registro ou saldo zero, retorna tudo como remaining
  IF current_balance IS NULL OR current_balance <= 0 THEN
    test_used := 0;
    remaining := _amount;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Calcular quanto consumir
  to_consume := LEAST(current_balance, _amount);
  leftover := _amount - to_consume;

  -- Debitar
  UPDATE flyer_maker_test_credits
  SET balance = balance - to_consume,
      updated_at = now()
  WHERE user_id = _user_id;

  test_used := to_consume;
  remaining := leftover;
  RETURN NEXT;
  RETURN;
END;
$$;
