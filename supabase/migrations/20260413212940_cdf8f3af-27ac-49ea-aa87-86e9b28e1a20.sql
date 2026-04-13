
-- Fix: Remove lifetime credits that were incorrectly given via refunds (should have been monthly)
-- For each affected user, reduce lifetime_balance by the inflated amount (capped at current lifetime)

DO $$
DECLARE
  rec RECORD;
  v_remove INTEGER;
  v_new_lifetime INTEGER;
  v_new_balance INTEGER;
BEGIN
  FOR rec IN 
    SELECT 
      t.user_id,
      SUM(t.amount) as refund_total,
      uc.lifetime_balance,
      uc.monthly_balance,
      LEAST(SUM(t.amount), uc.lifetime_balance) as amount_to_remove
    FROM upscaler_credit_transactions t
    JOIN upscaler_credits uc ON uc.user_id = t.user_id
    WHERE t.transaction_type = 'refund' 
    AND t.credit_type = 'lifetime' 
    AND t.amount > 0
    AND t.created_at > '2026-01-01'
    -- Exclude admin accounts
    AND t.user_id NOT IN (
      '61597c56-6d48-44d3-b236-5cb9cffcf995',
      'e72e5346-d38c-4578-bfa8-0920be38ade8'
    )
    GROUP BY t.user_id, uc.lifetime_balance, uc.monthly_balance
    HAVING LEAST(SUM(t.amount), uc.lifetime_balance) > 0
  LOOP
    v_remove := rec.amount_to_remove;
    v_new_lifetime := rec.lifetime_balance - v_remove;
    v_new_balance := rec.monthly_balance + v_new_lifetime;

    -- Update the credits
    UPDATE upscaler_credits
    SET lifetime_balance = v_new_lifetime,
        balance = v_new_balance,
        updated_at = now()
    WHERE user_id = rec.user_id;

    -- Log the correction
    INSERT INTO upscaler_credit_transactions (
      user_id, amount, balance_after, transaction_type, credit_type, description
    ) VALUES (
      rec.user_id, -v_remove, v_new_balance, 'correction', 'lifetime',
      'Correção: remoção de créditos vitalícios inflados por estornos que deveriam ter sido mensais'
    );
  END LOOP;
END;
$$;
