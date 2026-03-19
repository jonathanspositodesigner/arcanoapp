

## ✅ Correções Aplicadas — djcristianorangel@gmail.com + Race Condition

### 1. Créditos restaurados
- Plano Pro reativado: `plan_slug = 'pro'`, `is_active = true`, 5.000 créditos/mês
- Saldo atual: 5.020 (5.000 monthly + 20 lifetime)

### 2. Race condition corrigida (webhook-greenn)
**Optimistic lock** implementado em ambos os fluxos (Planos2 + Legacy):
- Antes de processar, o webhook faz `UPDATE webhook_logs SET result = 'processing' WHERE id = logId AND result = 'received'`
- Se retorna 0 rows → outro webhook já está processando → ignora
- Double-check adicional via `greenn_contract_id` + `result = 'success'`

### 3. Cancelamento inteligente
- Agora verifica se o `contractId` do webhook de cancelamento corresponde ao `greenn_contract_id` da subscription ativa
- Se não bater, NÃO cancela (evita cancelamentos cruzados)
- Fallback: se webhook não enviar contractId, mantém comportamento antigo

### Arquivos alterados
- `supabase/functions/webhook-greenn/index.ts` — idempotência + cancelamento
- Edge function redeployada ✅
