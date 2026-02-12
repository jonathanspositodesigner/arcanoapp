

# Corrigir créditos NOT NULL - Free Trial

## Causa raiz

A RPC `claim_arcano_free_trial_atomic` faz:
```sql
SELECT COALESCE(ats.credit_cost, 100) INTO v_credit_cost
FROM ai_tool_settings WHERE tool_name = 'arcano_cloner'
```

Quando nao existe nenhuma linha na tabela `ai_tool_settings` com `tool_name = 'arcano_cloner'`, o SELECT retorna **zero linhas** -- o COALESCE nem e avaliado porque nao ha linha nenhuma. Resultado: `v_credit_cost = NULL`, e `v_credits = NULL * 3 = NULL`.

Isso causa:
```
null value in column "credits_granted" violates not-null constraint
```

## Correcao

Atualizar a RPC para usar um fallback seguro quando nao ha registro em `ai_tool_settings`:

```sql
CREATE OR REPLACE FUNCTION claim_arcano_free_trial_atomic(p_user_id uuid, p_email text)
RETURNS TABLE(already_claimed boolean, credits_granted integer)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_credit_cost integer;
  v_credits integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_email));

  IF EXISTS (SELECT 1 FROM arcano_cloner_free_trials WHERE email = p_email) THEN
    RETURN QUERY SELECT true::boolean, 0::integer;
    RETURN;
  END IF;

  -- Fix: use separate variable assignment with fallback
  SELECT ats.credit_cost INTO v_credit_cost
  FROM ai_tool_settings ats
  WHERE ats.tool_name = 'arcano_cloner'
  LIMIT 1;

  -- When no row found, v_credit_cost is NULL, so default to 100
  v_credit_cost := COALESCE(v_credit_cost, 100);
  v_credits := v_credit_cost * 3;  -- = 300

  INSERT INTO arcano_cloner_free_trials (user_id, email, credits_granted)
  VALUES (p_user_id, p_email, v_credits);

  INSERT INTO upscaler_credits (user_id, monthly_balance, lifetime_balance, balance)
  VALUES (p_user_id, v_credits, 0, v_credits)
  ON CONFLICT (user_id) DO UPDATE
  SET monthly_balance = upscaler_credits.monthly_balance + v_credits,
      balance = upscaler_credits.balance + v_credits,
      updated_at = now();

  INSERT INTO upscaler_credit_transactions (user_id, amount, transaction_type, credit_type, description)
  VALUES (p_user_id, v_credits, 'bonus', 'monthly', '300 créditos grátis - Teste Grátis');

  RETURN QUERY SELECT false::boolean, v_credits::integer;
END;
$$;
```

A unica mudanca e separar o SELECT do COALESCE -- aplicar o COALESCE **depois** do SELECT para cobrir o caso de zero linhas retornadas.

## Apos corrigir

Limpar os registros do `lancadelivery@gmail.com` novamente (auth + profile + tokens + claims) para permitir um novo teste limpo.

## Arquivos modificados

- Migration SQL apenas (corrigir a RPC no banco)
- Nenhum arquivo de codigo frontend alterado
