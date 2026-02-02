
# Plano: Sistema de Créditos de IA por Período de Assinatura

## Resumo

Implementar um sistema onde:
- **Pro**: 900 créditos/período
- **IA Unlimited**: 1800 créditos/período
- Créditos são **resetados** (não somados) a cada renovação
- Quando assinatura expira → créditos zeram

---

## Mudanças Necessárias

### 1. Nova Função RPC no Banco de Dados

Criar uma função `reset_upscaler_credits` que substitui o saldo (não soma):

```sql
CREATE OR REPLACE FUNCTION public.reset_upscaler_credits(
  _user_id uuid, 
  _amount integer, 
  _description text DEFAULT 'Subscription credits reset'
)
RETURNS TABLE(success boolean, new_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_balance INTEGER;
BEGIN
  -- Insert or UPDATE credits to new value (reset, not add)
  INSERT INTO upscaler_credits (user_id, balance)
  VALUES (_user_id, _amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET balance = _amount, updated_at = now()
  RETURNING balance INTO updated_balance;
  
  -- Log transaction
  INSERT INTO upscaler_credit_transactions 
    (user_id, amount, balance_after, transaction_type, description)
  VALUES 
    (_user_id, _amount, updated_balance, 'reset', _description);
  
  RETURN QUERY SELECT TRUE, updated_balance;
END;
$$;
```

### 2. Página `/planos` (Planos.tsx)

Adicionar seção de benefícios extras nos cards Pro e IA Unlimited:

**Card Pro:**
```tsx
{plan.name === "Pro" && (
  <div className="mt-6 pt-4 border-t border-purple-500/20">
    <p className="text-xs text-purple-400 mb-2 uppercase tracking-wide">
      {t('planos.extraBenefits')}
    </p>
    <div className="flex items-center gap-2 text-sm">
      <Coins className="w-4 h-4 text-yellow-400" />
      <span className="text-purple-200">{t('planos.features.bonusCredits900')}</span>
    </div>
  </div>
)}
```

**Card IA Unlimited (atualizar):**
```tsx
{plan.name === "IA Unlimited" && (
  <div className="mt-6 pt-4 border-t border-purple-500/20">
    <p className="text-xs text-purple-400 mb-2 uppercase tracking-wide">
      {t('planos.extraBenefits')}
    </p>
    <div className="flex items-center gap-2 text-sm mb-2">
      <Sparkles className="w-4 h-4 text-purple-400" />
      <span className="text-purple-200">{t('planos.allAIFeatures')}</span>
    </div>
    <div className="flex items-center gap-2 text-sm">
      <Coins className="w-4 h-4 text-yellow-400" />
      <span className="text-purple-200">{t('planos.features.bonusCredits1800')}</span>
    </div>
  </div>
)}
```

### 3. Arquivos de Tradução

**`src/locales/pt/prompts.json`:**
```json
"features": {
  // ...existentes
  "bonusCredits900": "+900 créditos de IA/mês",
  "bonusCredits1800": "+1800 créditos de IA/mês"
}
```

**`src/locales/es/prompts.json`:**
```json
"features": {
  // ...existentes
  "bonusCredits900": "+900 créditos de IA/mes",
  "bonusCredits1800": "+1800 créditos de IA/mes"
}
```

### 4. Webhook Greenn (webhook-greenn/index.ts)

Adicionar lógica após ativar o premium:

```typescript
// Após upsert premium_users com sucesso...

// Reset credits based on plan (not add - complete reset)
const planCredits: Record<string, number> = {
  'arcano_pro': 900,
  'arcano_unlimited': 1800
};

const creditsToReset = planCredits[planType];
if (creditsToReset && creditsToReset > 0) {
  try {
    const { data: creditResult, error: creditError } = await supabase.rpc('reset_upscaler_credits', {
      _user_id: userId,
      _amount: creditsToReset,
      _description: `Créditos do plano ${planDisplayName} - ${billingPeriod === 'yearly' ? 'Renovação Anual' : 'Renovação Mensal'}`
    });
    
    if (creditError) {
      console.log(`   ├─ ⚠️ Erro ao resetar créditos: ${creditError.message}`);
    } else {
      console.log(`   ├─ ✅ Créditos resetados para ${creditsToReset}`);
    }
  } catch (creditError) {
    console.log(`   ├─ ⚠️ Falha ao resetar créditos: ${creditError}`);
  }
}
```

### 5. Zerar Créditos ao Expirar

No hook `usePremiumStatus` ou em um job agendado, quando a assinatura expira, zerar os créditos:

**Opção A - Frontend (simples):**
Quando o usuário logado tem `expires_at < now()`, a UI já mostra como expirado e não permite usar ferramentas.

**Opção B - Backend (recomendado):**
Adicionar no webhook de cancelamento/unpaid:

```typescript
// Handle deactivation
if (status === 'canceled' || status === 'unpaid' || status === 'refunded' || status === 'chargeback') {
  const userId = await findUserByEmail(supabase, email, requestId)

  if (userId) {
    await supabase.from('premium_users').update({ is_active: false }).eq('user_id', userId)
    
    // Zerar créditos ao cancelar/expirar
    await supabase.rpc('reset_upscaler_credits', {
      _user_id: userId,
      _amount: 0,
      _description: `Créditos zerados - ${status}`
    });
    
    console.log(`   ├─ ✅ Premium desativado + créditos zerados`)
    // ...
  }
}
```

---

## Fluxo Completo

```text
┌──────────────────────────────────────────────────────────────────┐
│               USUÁRIO ASSINA OU RENOVA PLANO                      │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Greenn webhook (paid/approved)                  │
│                                                                   │
│  1. Criar/encontrar usuário                                       │
│  2. Ativar/atualizar premium_users                               │
│  3. ★ RESET créditos via RPC:                                    │
│     - arcano_pro → RESET para 900                                │
│     - arcano_unlimited → RESET para 1800                         │
│  4. Enviar email de boas-vindas                                  │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│   Usuário pode usar créditos durante período de assinatura        │
└──────────────────────────────────────────────────────────────────┘
                                │
            ┌───────────────────┴───────────────────┐
            ▼                                       ▼
┌─────────────────────────┐             ┌─────────────────────────┐
│     ASSINATURA EXPIRA    │             │   USUÁRIO RENOVA        │
│   (canceled/unpaid)      │             │   (paid novamente)      │
└─────────────────────────┘             └─────────────────────────┘
            │                                       │
            ▼                                       ▼
┌─────────────────────────┐             ┌─────────────────────────┐
│  RESET créditos para 0  │             │  RESET créditos para    │
│  via webhook            │             │  900 ou 1800            │
└─────────────────────────┘             └─────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| Banco de dados | Criar função `reset_upscaler_credits` |
| `src/pages/Planos.tsx` | Adicionar seção de créditos nos cards Pro e Unlimited |
| `src/locales/pt/prompts.json` | Adicionar traduções `bonusCredits900` e `bonusCredits1800` |
| `src/locales/es/prompts.json` | Adicionar traduções `bonusCredits900` e `bonusCredits1800` |
| `supabase/functions/webhook-greenn/index.ts` | Adicionar lógica de reset de créditos |

---

## Resultado Esperado

1. Usuários veem os benefícios de créditos na página de planos
2. Ao assinar Pro → créditos resetados para 900
3. Ao assinar Unlimited → créditos resetados para 1800
4. Renovação → créditos resetados para o valor do plano (não acumulam)
5. Cancelamento/expiração → créditos zerados
6. Transações registradas no histórico com descrição clara
