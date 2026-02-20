

## Ativar Rodrigo Sacre + Proteger contra webhook duplicado

### Situacao
- Rodrigo Sacre (rodrigosacre46@icloud.com) pagou o Arcano IA Unlimited (product 148937)
- O PIX ainda esta em processamento, entao o webhook da Greenn pode cair a qualquer momento
- Precisamos ativar ele agora E garantir que quando o webhook chegar, nao resete os creditos dele

### Entendendo o risco real
A funcao `reset_upscaler_credits` faz RESET (nao adiciona), entao o webhook nao duplicaria creditos. Porem, se o Rodrigo ja tiver GASTO creditos quando o webhook chegar, o reset colocaria o saldo de volta em 1800, dando creditos "gratis". Precisamos evitar isso.

### Solucao (3 passos)

**Passo 1: Modificar `create-premium-user` para conceder creditos**

Apos criar/atualizar o registro em `premium_users`, adicionar logica para conceder os 1800 creditos mensais automaticamente (usando `reset_upscaler_credits` RPC que ja existe).

Isso sera util para ativacoes manuais futuras tambem.

**Passo 2: Adicionar guard no `webhook-greenn`**

Na secao de reset de creditos (linhas 280-298), antes de chamar `reset_upscaler_credits`, verificar:
- Se o usuario ja tem um registro em `premium_users` ativo com `plan_type = 'arcano_unlimited'`
- E se o `monthly_balance` ja esta >= ao valor do plano (1800)
- Se ambos forem verdade, pular o reset de creditos (so atualizar o premium_users normalmente)

Isso protege especificamente o caso onde o admin ativou manualmente e o webhook chega depois. Nao afeta renovacoes normais porque nelas o `monthly_balance` ja teria sido consumido.

Trecho a adicionar antes da linha 281:

```typescript
// Guard: se usuario ja tem creditos >= ao plano, nao resetar
// (protege contra webhook duplicado quando admin ja ativou)
if (creditsToReset && creditsToReset > 0) {
  const { data: currentCredits } = await supabase
    .from('upscaler_credits')
    .select('monthly_balance')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (currentCredits && currentCredits.monthly_balance >= creditsToReset) {
    console.log(`   |-- Creditos ja >= ${creditsToReset}, pulando reset (ativacao manual anterior)`);
    // Pular reset, creditos ja estao ok
  } else {
    // Reset normal
    await supabase.rpc('reset_upscaler_credits', { ... });
  }
}
```

**Passo 3: Invocar a edge function para ativar o Rodrigo**

Chamar `create-premium-user` com:
- Email: rodrigosacre46@icloud.com
- Plano: arcano_unlimited
- Periodo: monthly
- Dias: 30
- Ativo: true
- Product ID: 148937

Resultado esperado:
- `premium_users`: registro ativo, expira em 30 dias
- `upscaler_credits`: monthly_balance = 1800
- `upscaler_credit_transactions`: transacao registrada
- Quando webhook chegar: atualiza premium_users normalmente mas NAO reseta creditos (guard ativo)

### Arquivos alterados
- `supabase/functions/create-premium-user/index.ts` (adicionar concessao de creditos)
- `supabase/functions/webhook-greenn/index.ts` (adicionar guard contra reset duplicado)
