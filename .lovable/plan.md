

## Auditoria Completa: Bugs Encontrados no webhook-greenn

### Bug 1 — Créditos SEMPRE zerados no cancelamento (CRÍTICO)

**Localização:** Linhas 788-798 do `webhook-greenn/index.ts`

O fluxo de cancelamento faz a verificação de `contractId` corretamente para decidir se reseta o planos2 para Free (linhas 762-786). MAS logo depois, nas linhas 789-795, ele **SEMPRE** zera os créditos com `reset_upscaler_credits(_amount: 0)` — independente de o contrato ter batido ou não.

```text
Cenário de upgrade:
1. Usuário tem Pro (contractId=AAA, 5.000 créditos)
2. Faz upgrade para Ultimate (contractId=BBB, 14.000 créditos)
   → planos2_subscriptions atualiza greenn_contract_id para BBB
3. Greenn cancela contrato AAA (Pro antigo)
   → Webhook chega com contractId=AAA
   → Check na linha 765: AAA ≠ BBB → planos2 NÃO resetado ✅
   → Linha 790: reset_upscaler_credits(0) EXECUTA → créditos zerados ❌
```

O `reset_upscaler_credits(0)` nas linhas 789-795 precisa estar DENTRO do `if (contractMatches)`, não fora dele.

### Bug 2 — Premium legacy também zera indiscriminadamente

O mesmo problema existe para `premium_users` quando NÃO há contractId no webhook (linha 749-750): faz `update is_active=false` em TODOS os registros do usuário, e depois zera créditos para todos.

### Bug 3 — Créditos avulsos (pacotes vitalícios) não estão protegidos

Quando o cancelamento zera créditos com `reset_upscaler_credits(0)`, ele seta `monthly_balance = 0` mas preserva `lifetime_balance`. Isso está correto para pacotes avulsos. MAS o `balance` é recalculado como `0 + lifetime_balance`, então os créditos vitalícios são preservados. Este ponto está OK.

---

## Correções Necessárias

### 1. Mover o zeramento de créditos para dentro do `if (contractMatches)`

**Arquivo:** `supabase/functions/webhook-greenn/index.ts`

Na seção de cancelamento (linhas 738-812), o bloco de zeramento de créditos (linhas 788-798) precisa ficar DENTRO do `if (contractMatches)` block, junto com o reset do planos2 para Free. Se o contrato não bater, NÃO zerar créditos.

Lógica corrigida:
```text
if (contractMatches) {
  → Reset planos2 para Free
  → Zerar créditos mensais
} else {
  → NÃO zerar créditos (contrato antigo, não corresponde ao plano ativo)
}
```

### 2. Proteger o legacy premium da mesma forma

Para o fluxo legacy (premium_users), quando há contractId, só desativar se o contract bater. E só zerar créditos se realmente desativou o plano correto.

### 3. Fallback sem contractId

Quando o webhook NÃO envia contractId (fallback), manter o comportamento de zerar tudo como antes, já que não tem como saber qual contrato é. Mas logar um warning.

## Detalhes Técnicos

**Arquivo a editar:** `supabase/functions/webhook-greenn/index.ts` — seção de cancelamento (linhas 738-812)

A mudança principal é reestruturar o bloco para que `reset_upscaler_credits(0)` só execute quando `contractMatches === true`, movendo as linhas 789-798 para dentro do bloco `if (contractMatches)` que começa na linha 768.

