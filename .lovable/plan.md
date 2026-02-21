
## Alterar creditos de teste gratis para 180 com expiracao de 24 horas

### Resumo
Mudar de 300 para 180 creditos em todos os lugares (RPC, modais, paginas, emails) e atualizar a validade de "1 mes" para "24 horas".

### 1. RPC `claim_arcano_free_trial_atomic` (migracao SQL)
- Mudar `v_credits := v_credit_cost * 3` para `v_credits := 180`
- Adicionar `landing_trial_expires_at = now() + interval '24 hours'` no upsert
- Atualizar descricao da transacao para "180 creditos gratis - validos por 24h"

### 2. Frontend - 3 arquivos

**`src/components/arcano-cloner/ArcanoClonerAuthModal.tsx`**
- Linha 256: "300 creditos" -> "180 creditos"
- Linha 262: "1 mes" -> "24 horas"
- Linha 317: "300 creditos" -> "180 creditos"
- Linha 345: "300 creditos" -> "180 creditos"

**`src/components/ai-tools/AIToolsAuthModal.tsx`**
- Linha 241: "300 creditos" -> "180 creditos"
- Linha 247: "1 mes" -> "24 horas"
- Linha 305: "300 creditos" -> "180 creditos"
- Linha 334: "300 creditos" -> "180 creditos"

**`src/pages/TesteGratis.tsx`**
- Linhas 112, 222, 260, 318, 417, 435: "300 creditos" -> "180 creditos"
- Linhas 223, 319: "1 mes" -> "24 horas"

### 3. Edge Functions - 3 arquivos

**`supabase/functions/confirm-email-free-trial/index.ts`**
- Linha 25: "300 creditos" -> "180 creditos" (email HTML)
- Linha 181: `credits_granted: 300` -> `credits_granted: 180`
- Linha 208: descricao "300 creditos" -> "180 creditos"

**`supabase/functions/send-free-trial-confirmation-email/index.ts`**
- Linha 56: "300 creditos" -> "180 creditos" (email HTML)
- Linha 169: subject "300 creditos" -> "180 creditos"

**`supabase/functions/claim-arcano-free-trial/index.ts` e `claim-free-trial/index.ts`**
- Fallback `|| 300` -> `|| 180`

### 4. Edge Function `grant-recovery-credits/index.ts`
- Todas as referencias de "300 creditos" -> "180 creditos" (linhas 41, 45, 97, 190, 223, 261)
