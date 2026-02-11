
-- Migração: Transferir monthly_balance para lifetime_balance para usuários que resgataram UPSCALER_1500
-- Apenas transfere o que RESTA no monthly_balance (sem duplicar créditos)

DO $$
DECLARE
  rec RECORD;
  v_monthly INTEGER;
BEGIN
  FOR rec IN 
    SELECT DISTINCT pc.user_id 
    FROM promo_claims pc 
    WHERE pc.promo_code = 'UPSCALER_1500'
  LOOP
    -- Get current monthly balance
    SELECT monthly_balance INTO v_monthly 
    FROM upscaler_credits 
    WHERE user_id = rec.user_id;
    
    -- Skip if no balance to transfer
    IF v_monthly IS NULL OR v_monthly <= 0 THEN
      CONTINUE;
    END IF;
    
    -- Transfer: move monthly to lifetime
    UPDATE upscaler_credits
    SET 
      lifetime_balance = lifetime_balance + v_monthly,
      monthly_balance = 0,
      balance = 0 + lifetime_balance + v_monthly,
      updated_at = now()
    WHERE user_id = rec.user_id;
    
    -- Audit: debit monthly
    INSERT INTO upscaler_credit_transactions 
      (user_id, amount, balance_after, transaction_type, description, credit_type)
    SELECT 
      rec.user_id, 
      -v_monthly, 
      lifetime_balance + monthly_balance,
      'admin_adjustment', 
      'Migração promo UPSCALER_1500: transferência de mensal para vitalício',
      'monthly'
    FROM upscaler_credits WHERE user_id = rec.user_id;
    
    -- Audit: credit lifetime
    INSERT INTO upscaler_credit_transactions 
      (user_id, amount, balance_after, transaction_type, description, credit_type)
    SELECT 
      rec.user_id, 
      v_monthly, 
      lifetime_balance + monthly_balance,
      'admin_adjustment', 
      'Migração promo UPSCALER_1500: transferência de mensal para vitalício',
      'lifetime'
    FROM upscaler_credits WHERE user_id = rec.user_id;
    
    RAISE NOTICE 'Migrated user % : % monthly credits moved to lifetime', rec.user_id, v_monthly;
  END LOOP;
END $$;

-- Update promo_claims records to reflect correct credit_type
UPDATE promo_claims SET credit_type = 'lifetime' WHERE promo_code = 'UPSCALER_1500';
