
# Plano: Sistema de Créditos de IA com Saldo Mensal + Vitalício

## Problema Atual

A tabela `upscaler_credits` tem apenas um campo `balance`. Quando a assinatura renova, a função `reset_upscaler_credits` **sobrescreve tudo**, perdendo créditos vitalícios que o usuário possa ter ganho (bônus RunningHub, pacotes avulsos, créditos manuais).

## Solução: Dois Saldos Separados

Modificar a estrutura para ter dois saldos independentes:
- **`monthly_balance`**: Créditos da assinatura (resetam a cada ciclo)
- **`lifetime_balance`**: Créditos vitalícios (nunca são resetados, apenas consumidos)

## Mudanças no Banco de Dados

### 1. Alterar tabela `upscaler_credits`
```sql
ALTER TABLE upscaler_credits 
  ADD COLUMN monthly_balance INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN lifetime_balance INTEGER NOT NULL DEFAULT 0;

-- Migrar saldo atual para monthly (ou lifetime, dependendo da origem)
UPDATE upscaler_credits SET monthly_balance = balance;
```

### 2. Alterar tabela `upscaler_credit_transactions`
```sql
ALTER TABLE upscaler_credit_transactions 
  ADD COLUMN credit_type TEXT NOT NULL DEFAULT 'monthly' 
  CHECK (credit_type IN ('monthly', 'lifetime'));
```

### 3. Nova função `get_upscaler_credits`
Retornar a soma dos dois saldos (monthly + lifetime):
```sql
CREATE OR REPLACE FUNCTION get_upscaler_credits(_user_id uuid)
RETURNS INTEGER AS $$
  SELECT COALESCE(
    (SELECT monthly_balance + lifetime_balance FROM upscaler_credits WHERE user_id = _user_id),
    0
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### 4. Nova função `consume_upscaler_credits`
Consumir primeiro do monthly, depois do lifetime:
```sql
-- Lógica: gasta primeiro o monthly, depois o lifetime
```

### 5. Nova função `reset_upscaler_credits`
Resetar APENAS o `monthly_balance` (não toca no lifetime):
```sql
CREATE OR REPLACE FUNCTION reset_upscaler_credits(...)
-- SET monthly_balance = _amount (ignora lifetime)
```

### 6. Nova função `add_lifetime_credits`
Para adicionar créditos vitalícios:
```sql
CREATE OR REPLACE FUNCTION add_lifetime_credits(_user_id uuid, _amount integer, _description text)
-- Adiciona ao lifetime_balance
```

## Mudanças nos Webhooks

### `webhook-greenn/index.ts`
- Continua usando `reset_upscaler_credits` para assinaturas
- A função agora só reseta o `monthly_balance`

### `RunningHubBonusModal.tsx`
- Trocar `add_upscaler_credits` por `add_lifetime_credits`
- Assim o bônus RunningHub vai para créditos vitalícios

## Mudanças no Frontend

### Hook `useUpscalerCredits.tsx`
- Opcionalmente retornar breakdown: `{ total, monthly, lifetime }`
- O consumo continua igual (o banco decide qual saldo usar primeiro)

### `CreditsCard.tsx`
- Mostrar breakdown opcional: "X créditos mensais + Y vitalícios"

## Ordem de Consumo

Quando o usuário usa créditos:
1. Primeiro gasta do **monthly_balance** (que vai zerar no fim do ciclo)
2. Depois gasta do **lifetime_balance** (que é permanente)

Isso é mais justo: usa o que vai expirar primeiro.

## Exemplo de Fluxo

| Ação | Monthly | Lifetime | Total |
|------|---------|----------|-------|
| Assina Pro (900 créditos) | 900 | 0 | 900 |
| Bônus RunningHub (+210) | 900 | 210 | 1110 |
| Usa upscaler (-60) | 840 | 210 | 1050 |
| Assinatura renova (reset 900) | 900 | 210 | 1110 |
| Cancela assinatura (zera monthly) | 0 | 210 | 210 |

## Arquivos a Modificar

1. **Migração SQL** (nova) - Alterar estrutura das tabelas
2. **`supabase/functions/webhook-greenn/index.ts`** - Sem mudança (função reset vai mudar comportamento)
3. **`src/components/RunningHubBonusModal.tsx`** - Usar nova função `add_lifetime_credits`
4. **`src/hooks/useUpscalerCredits.tsx`** - Opcionalmente retornar breakdown
5. **`src/components/upscaler/CreditsCard.tsx`** - Opcionalmente mostrar breakdown

## Próximos Passos Após Implementação

- Admin panel para adicionar créditos vitalícios manualmente
- Página de venda de pacotes de créditos avulsos
- Webhook para compra de pacotes de créditos
