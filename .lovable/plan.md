

## Implementar Planos Pro, Ultimate e Unlimited + Expiracao 30 dias + Custo reduzido

Tudo separado dos planos Arcano Premium. Nada existente sera alterado.

---

### 1. Migracao SQL

Adicionar coluna `cost_multiplier` na tabela `planos2_subscriptions` (default 1.0) e criar a RPC `expire_planos2_subscriptions` que reverte assinaturas vencidas para o plano Free.

```text
ALTER TABLE planos2_subscriptions ADD COLUMN cost_multiplier NUMERIC DEFAULT 1.0;
```

A RPC `expire_planos2_subscriptions`:
- Busca registros onde expires_at < now() AND plan_slug != 'free' AND is_active = true
- Reseta para: plan_slug='free', credits_per_month=300, daily_prompt_limit=NULL, has_image/video=false, cost_multiplier=1.0, expires_at=NULL, greenn_product_id=NULL, greenn_contract_id=NULL
- Chama reset_upscaler_credits para setar 300 creditos
- Retorna quantidade de usuarios expirados

---

### 2. Webhook `webhook-greenn-planos2/index.ts`

Adicionar os 3 novos produtos ao mapeamento e incluir `cost_multiplier` + `expires_at` no upsert:

| Produto | Slug | Creditos | Prompts/dia | Imagem | Video | cost_multiplier |
|---------|------|----------|-------------|--------|-------|-----------------|
| 160732 | starter | 1.800 | 5 | Nao | Nao | 1.0 |
| 160735 | pro | 4.200 | 10 | Sim | Sim | 1.0 |
| 160738 | ultimate | 10.800 | 24 | Sim | Sim | 1.0 |
| 160742 | unlimited | 999999 | null | Sim | Sim | 0.5 |

No upsert, adicionar:
- `cost_multiplier: planConfig.cost_multiplier`
- `expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()`

Para o Unlimited, os creditos serao 999999 (efetivamente infinitos). O `reset_upscaler_credits` aceita ate 100000, entao sera necessario usar um valor de 99999 no RPC e ajustar.

Correcao: a RPC `reset_upscaler_credits` valida `_amount <= 100000`. Para o Unlimited usaremos 99999 creditos (praticamente infinito para uso mensal).

---

### 3. Hook `usePlanos2Access.ts`

Adicionar `cost_multiplier` na query e retornar `costMultiplier` no resultado do hook.

---

### 4. `GerarImagemTool.tsx`

Apos a linha 53, verificar tambem se o usuario e planos2 com costMultiplier < 1. A logica de custo fica:

```text
Se arcano_unlimited (legado) → custo reduzido (ja funciona)
Se planos2 com costMultiplier 0.5 → custo * 0.5 (normal: 40, pro: 50)
Senao → custo normal (normal: 80, pro: 100)
```

---

### 5. `GerarVideoTool.tsx`

Mesma logica: se planos2 com costMultiplier 0.5, custo do video = 750 em vez de 1500.

---

### Resumo de arquivos

**Migracao SQL:**
- Adicionar coluna `cost_multiplier` em `planos2_subscriptions`
- Criar RPC `expire_planos2_subscriptions`

**Arquivos editados:**
- `supabase/functions/webhook-greenn-planos2/index.ts` - 3 novos produtos + expires_at + cost_multiplier
- `src/hooks/usePlanos2Access.ts` - Retornar costMultiplier
- `src/pages/GerarImagemTool.tsx` - Aplicar costMultiplier do planos2
- `src/pages/GerarVideoTool.tsx` - Aplicar costMultiplier do planos2

**Nada muda nos planos Arcano Premium existentes.**
