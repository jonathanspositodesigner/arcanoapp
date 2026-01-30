-- Create upscaler_credits table
CREATE TABLE public.upscaler_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.upscaler_credits ENABLE ROW LEVEL SECURITY;

-- Policies for upscaler_credits
CREATE POLICY "Users can view their own credits" 
  ON public.upscaler_credits 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all credits" 
  ON public.upscaler_credits 
  FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create upscaler_credit_transactions table (history)
CREATE TABLE public.upscaler_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.upscaler_credit_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for upscaler_credit_transactions
CREATE POLICY "Users can view their own transactions" 
  ON public.upscaler_credit_transactions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all transactions" 
  ON public.upscaler_credit_transactions 
  FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Function to get upscaler credits balance
CREATE OR REPLACE FUNCTION public.get_upscaler_credits(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT balance FROM upscaler_credits WHERE user_id = _user_id),
    0
  )
$$;

-- Function to consume upscaler credits
CREATE OR REPLACE FUNCTION public.consume_upscaler_credits(
  _user_id UUID,
  _amount INTEGER,
  _description TEXT DEFAULT 'Upscaler usage'
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_balance INTEGER;
  updated_balance INTEGER;
BEGIN
  -- Get current balance (or create if not exists)
  INSERT INTO upscaler_credits (user_id, balance)
  VALUES (_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT balance INTO current_balance
  FROM upscaler_credits
  WHERE user_id = _user_id
  FOR UPDATE;
  
  IF current_balance < _amount THEN
    RETURN QUERY SELECT FALSE, current_balance, 'Saldo insuficiente'::TEXT;
    RETURN;
  END IF;
  
  updated_balance := current_balance - _amount;
  
  UPDATE upscaler_credits
  SET balance = updated_balance, updated_at = now()
  WHERE user_id = _user_id;
  
  INSERT INTO upscaler_credit_transactions 
    (user_id, amount, balance_after, transaction_type, description)
  VALUES 
    (_user_id, -_amount, updated_balance, 'consumption', _description);
  
  RETURN QUERY SELECT TRUE, updated_balance, NULL::TEXT;
END;
$$;

-- Function to add credits (for admin use)
CREATE OR REPLACE FUNCTION public.add_upscaler_credits(
  _user_id UUID,
  _amount INTEGER,
  _description TEXT DEFAULT 'Credit added'
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_balance INTEGER;
BEGIN
  -- Insert or update credits
  INSERT INTO upscaler_credits (user_id, balance)
  VALUES (_user_id, _amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET balance = upscaler_credits.balance + _amount, updated_at = now()
  RETURNING balance INTO updated_balance;
  
  INSERT INTO upscaler_credit_transactions 
    (user_id, amount, balance_after, transaction_type, description)
  VALUES 
    (_user_id, _amount, updated_balance, 'credit', _description);
  
  RETURN QUERY SELECT TRUE, updated_balance;
END;
$$;