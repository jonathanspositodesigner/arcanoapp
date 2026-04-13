
-- 1. Estornar 75 créditos para gferraz (arcano_cloner job e3eee1f7)
DO $$
DECLARE
  v_user_id UUID := '57940da1-9edf-421e-842c-d32357b5479c';
  v_amount INT := 75;
  v_new_balance INT;
BEGIN
  UPDATE upscaler_credits
  SET monthly_balance = monthly_balance + v_amount,
      balance = monthly_balance + v_amount + lifetime_balance,
      updated_at = now()
  WHERE user_id = v_user_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO upscaler_credit_transactions (user_id, amount, balance_after, transaction_type, credit_type, description)
  VALUES (v_user_id, v_amount, v_new_balance, 'refund', 'monthly', 'Correção manual: estorno de job arcano_cloner e3eee1f7 (falhou sem reembolso)');

  UPDATE arcano_cloner_jobs SET credits_refunded = true WHERE id = 'e3eee1f7-069e-4a05-8320-263502f12fa1';
END;
$$;

-- 2. Estornar 60 créditos para rafaeloliveira (upscaler job 41126ab5)
DO $$
DECLARE
  v_user_id UUID := 'dcbe74bb-3d90-4764-a246-e0f67a728dfd';
  v_amount INT := 60;
  v_new_balance INT;
BEGIN
  UPDATE upscaler_credits
  SET monthly_balance = monthly_balance + v_amount,
      balance = monthly_balance + v_amount + lifetime_balance,
      updated_at = now()
  WHERE user_id = v_user_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO upscaler_credit_transactions (user_id, amount, balance_after, transaction_type, credit_type, description)
  VALUES (v_user_id, v_amount, v_new_balance, 'refund', 'monthly', 'Correção manual: estorno de job upscaler 41126ab5 (falhou sem reembolso)');

  UPDATE upscaler_jobs SET credits_refunded = true WHERE id = '41126ab5-1e3a-42de-8c97-7986595ac219';
END;
$$;

-- 3. Zerar créditos mensais de contas sem plano ativo com saldo inflado
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT uc.user_id, uc.monthly_balance, uc.lifetime_balance, p.email
    FROM upscaler_credits uc
    JOIN profiles p ON p.id = uc.user_id
    WHERE uc.monthly_balance >= 5000
    AND NOT EXISTS (
      SELECT 1 FROM planos2_subscriptions ps 
      WHERE ps.user_id = uc.user_id AND ps.is_active = true
    )
  LOOP
    UPDATE upscaler_credits
    SET monthly_balance = 0,
        balance = lifetime_balance,
        updated_at = now()
    WHERE user_id = rec.user_id;

    INSERT INTO upscaler_credit_transactions (user_id, amount, balance_after, transaction_type, credit_type, description)
    VALUES (rec.user_id, -rec.monthly_balance, rec.lifetime_balance, 'correction', 'monthly',
      'Correção: remoção de créditos mensais inflados (plano expirado/inexistente) - email: ' || rec.email);
  END LOOP;
END;
$$;
