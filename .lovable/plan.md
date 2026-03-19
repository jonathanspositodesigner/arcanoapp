

## ✅ Correções Aplicadas — Race Condition + Cancelamento Inteligente

### 1. Créditos restaurados (djcristianorangel@gmail.com)
- Plano Pro reativado: `plan_slug = 'pro'`, `is_active = true`, 5.000 créditos/mês
- Saldo atual: 5.020 (5.000 monthly + 20 lifetime)

### 2. Race condition corrigida (webhook-greenn)
**Optimistic lock** implementado em ambos os fluxos (Planos2 + Legacy):
- Antes de processar, o webhook faz `UPDATE webhook_logs SET result = 'processing' WHERE id = logId AND result = 'received'`
- Se retorna 0 rows → outro webhook já está processando → ignora
- Double-check adicional via `greenn_contract_id` + `result = 'success'`

### 3. Cancelamento inteligente (v2)
- Verifica se o `contractId` do webhook corresponde ao `greenn_contract_id` da subscription ativa
- **Créditos só são zerados se o contrato bater** (movido para dentro do `if (contractMatches)`)
- Se não bater, NÃO cancela E NÃO zera créditos (protege upgrades Pro→Ultimate)
- Fallback legacy: só zera créditos se não houver planos2 ativo E não houver contractId
- Premium legacy: filtra desativação por `greenn_contract_id` quando disponível

### Cenário protegido: Upgrade
1. Usuário Pro (contract AAA, 5.000 créditos) → Upgrade Ultimate (contract BBB, 14.000 créditos)
2. Greenn cancela contract AAA → webhook chega com contractId=AAA
3. Sistema verifica: AAA ≠ BBB → **NÃO reseta planos2, NÃO zera créditos** ✅

### Arquivos alterados
- `supabase/functions/webhook-greenn/index.ts` — idempotência + cancelamento inteligente v2
