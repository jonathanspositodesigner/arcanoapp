DO $$
DECLARE
  _user_id UUID := '8f5fb835-2c26-400e-8826-2639eb1e0521';
  _amount INTEGER := 4500;
  _current_lifetime INTEGER;
  _current_monthly INTEGER;
  _new_lifetime INTEGER;
  _new_balance INTEGER;
BEGIN
  SELECT lifetime_balance, monthly_balance INTO _current_lifetime, _current_monthly
  FROM upscaler_credits WHERE user_id = _user_id;

  _new_lifetime := GREATEST(_current_lifetime - _amount, 0);
  _new_balance := _current_monthly + _new_lifetime;

  UPDATE upscaler_credits
  SET lifetime_balance = _new_lifetime,
      balance = _new_balance,
      updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO upscaler_credit_transactions (user_id, amount, balance_after, transaction_type, description, credit_type)
  VALUES (_user_id, -_amount, _new_balance, 'refund', 'Correção manual: 2 reembolsos Pagar.me (1500x2) + 1 duplicata race condition (1500) não revogados', 'lifetime');
END $$;