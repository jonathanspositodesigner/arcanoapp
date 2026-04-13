
DO $$
DECLARE
  rec RECORD;
  v_restore INTEGER;
  v_new_balance INTEGER;
BEGIN
  FOR rec IN 
    SELECT 
      ct.user_id,
      ABS(ct.amount) as amount_to_restore,
      uc.monthly_balance,
      uc.lifetime_balance
    FROM upscaler_credit_transactions ct
    JOIN upscaler_credits uc ON uc.user_id = ct.user_id
    JOIN planos2_subscriptions ps ON ps.user_id = ct.user_id
    WHERE ct.transaction_type = 'correction' AND ct.credit_type = 'lifetime'
    AND ps.is_active = true
    AND (ps.expires_at IS NULL OR ps.expires_at > now())
  LOOP
    v_restore := rec.amount_to_restore;
    v_new_balance := rec.monthly_balance + v_restore + rec.lifetime_balance;

    UPDATE upscaler_credits
    SET monthly_balance = monthly_balance + v_restore,
        balance = monthly_balance + v_restore + lifetime_balance,
        updated_at = now()
    WHERE user_id = rec.user_id;

    INSERT INTO upscaler_credit_transactions (
      user_id, amount, balance_after, transaction_type, credit_type, description
    ) VALUES (
      rec.user_id, v_restore, v_new_balance, 'correction', 'monthly',
      'Restauração: créditos devolvidos ao saldo mensal (estorno legítimo durante vigência do plano)'
    );
  END LOOP;
END;
$$;
