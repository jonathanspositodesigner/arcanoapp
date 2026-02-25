

## Reset Individual de Creditos: 300 no primeiro acesso, 100/mes depois de 30 dias

### Resumo
- Primeiro acesso (confirmacao de email): usuario recebe **300 creditos**
- A cada 30 dias apos isso: renova com **100 creditos** (nao 300)
- Reset individual por usuario (baseado na data da assinatura, nao global)

### Mudancas

#### 1. Migration SQL

**Adicionar coluna `last_credit_reset_at`** na tabela `planos2_subscriptions`:
```sql
ALTER TABLE planos2_subscriptions 
ADD COLUMN last_credit_reset_at timestamptz DEFAULT now();
```

**Inicializar usuarios existentes** com a data de criacao da subscription:
```sql
UPDATE planos2_subscriptions 
SET last_credit_reset_at = created_at 
WHERE last_credit_reset_at IS NULL OR last_credit_reset_at = created_at;
```

**Alterar default de `credits_per_month`** de 300 para 100 (Free plan renova com 100):
```sql
ALTER TABLE planos2_subscriptions 
ALTER COLUMN credits_per_month SET DEFAULT 100;
```

**Criar funcao `reset_individual_monthly_credits()`:**
```sql
CREATE OR REPLACE FUNCTION reset_individual_monthly_credits()
RETURNS TABLE(users_reset integer)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sub RECORD;
  reset_count INTEGER := 0;
BEGIN
  FOR sub IN
    SELECT user_id, credits_per_month
    FROM planos2_subscriptions
    WHERE is_active = true
    AND credits_per_month > 0
    AND (expires_at IS NULL OR expires_at > now())
    AND last_credit_reset_at <= now() - INTERVAL '30 days'
  LOOP
    PERFORM reset_upscaler_credits(
      sub.user_id,
      sub.credits_per_month,
      'Reset mensal individual (30 dias)'
    );
    UPDATE planos2_subscriptions
    SET last_credit_reset_at = now()
    WHERE user_id = sub.user_id;
    reset_count := reset_count + 1;
  END LOOP;
  RETURN QUERY SELECT reset_count;
END;
$$;
```

**Atualizar `expire_planos2_subscriptions`** para setar `last_credit_reset_at = now()` e `credits_per_month = 100` ao reverter para Free:
- Quando um plano pago expira e volta pro Free, o `credits_per_month` sera 100 (nao 300)
- E o `last_credit_reset_at` reseta para `now()` (recomeca contagem de 30 dias)

#### 2. Edge Function: `confirm-email/index.ts`

Alterar a criacao da subscription Free para `credits_per_month: 100` (renovacao mensal), mas manter o grant inicial de 300 creditos:

```typescript
// Cria subscription com credits_per_month = 100 (renovacao)
await supabaseAdmin.from("planos2_subscriptions").insert({
  user_id: tokenData.user_id,
  plan_slug: "free",
  is_active: true,
  credits_per_month: 100,  // <-- era 300, agora 100 (renovacao)
  daily_prompt_limit: 0,
  has_image_generation: false,
  has_video_generation: false,
});

// Grant inicial continua 300
await supabaseAdmin.rpc("reset_upscaler_credits", {
  _user_id: tokenData.user_id,
  _amount: 300,  // <-- primeiro acesso = 300
  _description: "Créditos iniciais - Plano Free (300 de boas-vindas)",
});
```

#### 3. Nova Edge Function: `cron-reset-credits/index.ts`

Endpoint simples que chama a RPC `reset_individual_monthly_credits()`. Protegido por Authorization header.

#### 4. Cron Job (pg_cron + pg_net)

```sql
SELECT cron.schedule(
  'reset-individual-credits',
  '0 */6 * * *',  -- a cada 6 horas
  $$ SELECT net.http_post(
    url:='https://jooojbaljrshgpaxdlou.supabase.co/functions/v1/cron-reset-credits',
    headers:='{"Authorization": "Bearer <anon_key>"}'::jsonb,
    body:='{}'::jsonb
  ) $$
);
```

#### 5. webhook-greenn/index.ts

Adicionar `last_credit_reset_at: new Date().toISOString()` no upsert de subscriptions pagas (para resetar contagem quando compra plano novo).

### Fluxo Final

```text
Usuario confirma email
  -> Recebe 300 creditos (bonus primeiro acesso)
  -> credits_per_month = 100 (para renovacoes)
  -> last_credit_reset_at = agora

30 dias depois (cron roda a cada 6h)
  -> Encontra usuario com last_credit_reset_at > 30 dias
  -> reset_upscaler_credits(user, 100)  <-- 100, nao 300
  -> last_credit_reset_at = agora

Mais 30 dias -> repete com 100
```

### Arquivos afetados
- Nova migration SQL (coluna + funcoes + inicializacao)
- `supabase/functions/confirm-email/index.ts` (credits_per_month: 100)
- `supabase/functions/cron-reset-credits/index.ts` (nova)
- `supabase/functions/webhook-greenn/index.ts` (add last_credit_reset_at)
- Cron job via pg_cron
