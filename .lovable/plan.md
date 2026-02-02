

# Plano: Visor de Créditos com Atualização Animada em Tempo Real

## Objetivo

Quando o saldo de créditos mudar (seja por consumo ou recarga), o número deve animar suavemente subindo ou descendo até o novo valor, com feedback visual claro.

---

## Arquitetura da Solução

### 1. Hook `useAnimatedNumber`

Um novo hook que anima a transição entre valores numéricos:

```
valorAnterior → [animação contagem] → valorNovo
```

**Características:**
- Animação de ~500ms usando requestAnimationFrame
- Easing suave (ease-out) para parecer natural
- Suporta números subindo e descendo
- Cor verde quando sobe, vermelha quando desce

---

### 2. Componente `AnimatedCreditsDisplay`

Componente reutilizável que exibe créditos com animação:

```text
┌─────────────────────────────────┐
│  🪙  [número animando...]       │
│      ↓ (animação de contagem)   │
│  🪙  900.150                    │
└─────────────────────────────────┘
```

**Comportamento visual:**
- Quando diminui: Número fica vermelho brevemente → anima descendo
- Quando aumenta: Número fica verde brevemente → anima subindo
- Após animação: Volta à cor normal (branca/roxa)

---

### 3. Realtime com Supabase

Adicionar listener de realtime na tabela `upscaler_credit_transactions`:

```tsx
supabase
  .channel('credit-changes')
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'upscaler_credit_transactions',
    filter: `user_id=eq.${userId}`
  }, () => refetchCredits())
  .subscribe();
```

Isso garante que qualquer alteração (via webhook, edge function, etc.) atualize automaticamente o saldo.

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/hooks/useAnimatedNumber.ts` | **Criar** - Hook de animação numérica |
| `src/components/upscaler/AnimatedCreditsDisplay.tsx` | **Criar** - Componente de exibição animada |
| `src/hooks/useUpscalerCredits.tsx` | **Modificar** - Adicionar realtime listener |
| `src/components/ToolsHeader.tsx` | **Modificar** - Usar AnimatedCreditsDisplay |
| `src/components/upscaler/CreditsCard.tsx` | **Modificar** - Usar AnimatedCreditsDisplay |
| `src/pages/CreditHistory.tsx` | **Modificar** - Usar AnimatedCreditsDisplay |

---

## Hook `useAnimatedNumber` - Detalhes

```tsx
const useAnimatedNumber = (
  targetValue: number, 
  duration: number = 500
) => {
  // Retorna:
  // - displayValue: número a exibir (animado)
  // - isAnimating: boolean
  // - direction: 'up' | 'down' | null
}
```

**Lógica:**
1. Quando `targetValue` muda, detecta se subiu ou desceu
2. Inicia animação do valor atual até o novo valor
3. Usa requestAnimationFrame para performance suave
4. Interpola linearmente com easing

---

## Componente `AnimatedCreditsDisplay` - Detalhes

```tsx
interface Props {
  credits: number;
  isLoading: boolean;
  size?: 'sm' | 'md' | 'lg';
  showCoin?: boolean;
}
```

**Classes condicionais:**
- `text-green-400` + `animate-pulse` quando subindo
- `text-red-400` + `animate-pulse` quando descendo  
- `text-white` (ou tema) quando estável

---

## Realtime - Detalhes Técnicos

**Migração SQL necessária:**
```sql
ALTER PUBLICATION supabase_realtime 
ADD TABLE public.upscaler_credit_transactions;
```

**No hook `useUpscalerCredits`:**
```tsx
useEffect(() => {
  if (!userId) return;
  
  const channel = supabase
    .channel(`credits-${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'upscaler_credit_transactions',
      filter: `user_id=eq.${userId}`
    }, () => fetchBalance())
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [userId, fetchBalance]);
```

---

## Fluxo Completo

```text
1. Usuário usa ferramenta IA
   ↓
2. Backend debita créditos (INSERT em transactions)
   ↓
3. Realtime detecta INSERT
   ↓
4. useUpscalerCredits.refetch() é chamado
   ↓
5. balance muda (ex: 900 → 840)
   ↓
6. AnimatedCreditsDisplay detecta mudança
   ↓
7. useAnimatedNumber anima: 900 → 899 → 898... → 840
   ↓
8. Número fica vermelho durante animação
   ↓
9. Volta ao normal após 500ms
```

---

## Resultado Esperado

- **Header**: Badge de créditos anima suavemente ao mudar
- **ProfileSettings**: CreditsCard mostra animação no saldo
- **CreditHistory**: Saldo atual também anima
- **Tempo real**: Qualquer mudança (até de outro dispositivo) reflete instantaneamente

