

## Remover Restricoes do Bonus Arcano Cloner

### Problema Atual

A edge function `claim-arcano-free-trial` bloqueia o bonus para:
1. Usuarios premium ("Voce ja e premium! Nao precisa do bonus.")
2. Usuarios que ja compraram creditos ("Voce ja possui creditos.")
3. Usuarios que ja resgataram (unica restricao que deve permanecer)

### Nova Regra

Dar o bonus de 3 geracoes gratuitas para QUALQUER usuario autenticado, desde que seja a primeira vez. A unica verificacao que permanece e: "ja resgatou antes?"

### Mudancas

#### 1. Edge Function: `supabase/functions/claim-arcano-free-trial/index.ts`

Remover os blocos de verificacao #2 (premium) e #3 (lifetime_balance). Manter apenas o bloco #1 (already_claimed).

Linhas a remover:
- Linhas 63-76: check de premium (`premium_users`)
- Linhas 78-90: check de creditos comprados (`lifetime_balance > 0`)

#### 2. Frontend: `src/pages/ArcanoClonerTool.tsx`

Remover os tratamentos de `is_premium` e `has_purchased` na resposta do claim (linhas 150-153), mantendo apenas `already_claimed` e `success`.

### Arquivos

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/claim-arcano-free-trial/index.ts` | Remover checks de premium e lifetime_balance (linhas 63-90) |
| `src/pages/ArcanoClonerTool.tsx` | Remover tratamento de `is_premium` e `has_purchased` (linhas 150-153) |

