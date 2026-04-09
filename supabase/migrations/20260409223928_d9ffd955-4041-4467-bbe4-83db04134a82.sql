CREATE OR REPLACE FUNCTION public.consume_upscaler_credits(
  _user_id uuid,
  _amount integer,
  _description text DEFAULT NULL
)
RETURNS TABLE(success boolean, new_balance integer, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _monthly_bal integer;
  _lifetime_bal integer;
  _total integer;
  _monthly_deduct integer;
  _lifetime_deduct integer;
  _is_unlimited boolean;
BEGIN
  _is_unlimited := is_unlimited_subscriber(_user_id);

  IF _is_unlimited AND (_description IS NULL OR (
    _description NOT LIKE '%Veo 3.1%'
  )) THEN
    SELECT COALESCE(monthly_balance, 0) + COALESCE(lifetime_balance, 0)
    INTO _total
    FROM upscaler_credits
    WHERE user_id = _user_id;
    
    RETURN QUERY SELECT TRUE, COALESCE(_total, 0), NULL::TEXT;
    RETURN;
  END IF;

  SELECT monthly_balance, lifetime_balance
  INTO _monthly_bal, _lifetime_bal
  FROM upscaler_credits
  WHERE user_id = _user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'Usuário não encontrado'::TEXT;
    RETURN;
  END IF;

  _total := COALESCE(_monthly_bal, 0) + COALESCE(_lifetime_bal, 0);

  IF _total < _amount THEN
    RETURN QUERY SELECT FALSE, _total, 'Saldo insuficiente'::TEXT;
    RETURN;
  END IF;

  IF COALESCE(_monthly_bal, 0) >= _amount THEN
    _monthly_deduct := _amount;
    _lifetime_deduct := 0;
  ELSE
    _monthly_deduct := COALESCE(_monthly_bal, 0);
    _lifetime_deduct := _amount - _monthly_deduct;
  END IF;

  UPDATE upscaler_credits
  SET monthly_balance = COALESCE(monthly_balance, 0) - _monthly_deduct,
      lifetime_balance = COALESCE(lifetime_balance, 0) - _lifetime_deduct
  WHERE user_id = _user_id;

  INSERT INTO upscaler_credit_transactions (user_id, amount, transaction_type, description)
  VALUES (_user_id, -_amount, 'consumption', COALESCE(_description, 'AI Tool'));

  _total := _total - _amount;
  RETURN QUERY SELECT TRUE, _total, NULL::TEXT;
END;
$$;