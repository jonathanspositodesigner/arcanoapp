-- Create reset_upscaler_credits function for subscription-based credit system
CREATE OR REPLACE FUNCTION public.reset_upscaler_credits(
  _user_id uuid, 
  _amount integer, 
  _description text DEFAULT 'Subscription credits reset'
)
RETURNS TABLE(success boolean, new_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_balance INTEGER;
BEGIN
  -- Insert or UPDATE credits to new value (reset, not add)
  INSERT INTO upscaler_credits (user_id, balance)
  VALUES (_user_id, _amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET balance = _amount, updated_at = now()
  RETURNING balance INTO updated_balance;
  
  -- Log transaction
  INSERT INTO upscaler_credit_transactions 
    (user_id, amount, balance_after, transaction_type, description)
  VALUES 
    (_user_id, _amount, updated_balance, 'reset', _description);
  
  RETURN QUERY SELECT TRUE, updated_balance;
END;
$$;