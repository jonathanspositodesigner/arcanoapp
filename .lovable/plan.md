

# Mostrar origem dos créditos por job na página Custos IA

## Problema
Atualmente o dashboard mostra o tipo do usuário baseado no estado **atual** (Free, Comprou Créditos, Premium, Premium + Créditos). Falta identificar quem usou créditos resgatados (promo UPSCALER_1500) e mostrar a origem dos créditos **no momento de cada job**.

## Solução

Adicionar uma nova consulta à tabela `promo_claims` e `upscaler_credit_transactions` para enriquecer o tipo do usuário com mais granularidade.

### Alterações em `src/components/admin/AdminAIToolsUsageTab.tsx`

**1. Expandir o tipo `UserClientType` (linha 59)**
Adicionar novos valores: `'redeemed_credits'` e `'free_trial'`

```typescript
type UserClientType = 'free' | 'bought_credits' | 'redeemed_credits' | 'free_trial' | 'premium' | 'premium_credits';
```

**2. Atualizar a lógica de detecção (linhas 196-226)**
Adicionar uma terceira query paralela para buscar quem resgatou o código `UPSCALER_1500` e quem usou trial gratuito:

```typescript
const [subsRes, creditsRes, promoRes, trialRes] = await Promise.all([
  // ... existentes ...
  supabase.from('promo_claims').select('user_id').eq('promo_code', 'UPSCALER_1500').in('user_id', userIds),
  supabase.from('arcano_cloner_free_trials').select('user_id').in('user_id', userIds),
]);
```

Lógica de prioridade para o mapa:
- Premium + créditos comprados → `premium_credits`
- Premium sem créditos → `premium`
- Resgatou promo UPSCALER_1500 → `redeemed_credits`
- Tem lifetime_balance > 0 (e não resgatou) → `bought_credits`
- Usou free trial → `free_trial`
- Nenhum → `free`

**3. Adicionar badges para os novos tipos (função `getUserTypeBadge`, linhas 339-351)**

- `redeemed_credits` → Badge azul "Resgate Créditos"
- `free_trial` → Badge cinza-azulada "Trial Gratuito"

### Sem alterações no backend
Todas as consultas são feitas no frontend usando queries simples às tabelas existentes (`promo_claims`, `arcano_cloner_free_trials`). Não precisa alterar RPCs.

