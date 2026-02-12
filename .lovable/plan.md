
# Corrigir erro `balance_after` NOT NULL na RPC de Free Trial

## Problema

O erro agora e diferente do anterior. A RPC `claim_arcano_free_trial_atomic` faz um INSERT em `upscaler_credit_transactions` **sem incluir a coluna `balance_after`**, que e NOT NULL:

```
null value in column "balance_after" of relation "upscaler_credit_transactions" violates not-null constraint
```

O credito e inserido em `upscaler_credits` com sucesso, mas a transacao de auditoria falha, e como tudo esta dentro de uma transacao, o Postgres faz rollback de tudo -- nenhum credito e salvo.

## Correcao

Atualizar a RPC para calcular o `balance_after` apos o upsert em `upscaler_credits` e incluir esse valor no INSERT da transacao:

```sql
CREATE OR REPLACE FUNCTION claim_arcano_free_trial_atomic(...)
-- apos o upsert em upscaler_credits:
DECLARE
  v_balance_after integer;
BEGIN
  ...
  -- upsert upscaler_credits (ja existente)
  ...

  -- Buscar o saldo atualizado
  SELECT balance INTO v_balance_after
  FROM upscaler_credits WHERE user_id = p_user_id;

  -- INSERT com balance_after
  INSERT INTO upscaler_credit_transactions
    (user_id, amount, balance_after, transaction_type, credit_type, description)
  VALUES
    (p_user_id, v_credits, v_balance_after, 'bonus', 'monthly', '300 creditos gratis - Teste Gratis');
  ...
END;
```

## Limpeza pos-correcao

Deletar novamente todos os registros de `lancadelivery@gmail.com` (user_id `88628b6a-e6ae-48d9-8c6d-57ac3e0695f9`) das tabelas:
- `arcano_cloner_free_trials`
- `upscaler_credits`
- `upscaler_credit_transactions`
- `email_confirmation_tokens`
- `profiles`
- `auth.users`

Para permitir um teste 100% limpo do zero.

## Detalhes tecnicos

- Apenas 1 migration SQL (recriar a RPC com a coluna `balance_after`)
- Nenhum arquivo frontend alterado
- A variavel `v_balance_after` e lida **apos** o upsert, garantindo que reflete o saldo correto
