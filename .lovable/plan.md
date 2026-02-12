
# Simplificar o Modal de Free Trial + Corrigir créditos do usuário

## Problema identificado

1. O usuário `edemar.seemg@gmail.com` criou conta e verificou email, mas **nunca recebeu os 300 créditos**. A edge function `claim-arcano-free-trial` nunca foi chamada para ele.

2. **Causa raiz**: O modal começa com um passo "Criar conta no RunningHub" com timer de 15 segundos. Isso confunde os usuarios que nao entendem o que e RunningHub e desistem ou se perdem no fluxo.

3. Alem disso, se o usuario cria conta, sai pra verificar email, e depois faz login normalmente (fora do modal), o callback `handleAuthSuccess` do modal nao executa, entao o claim nunca acontece.

## Plano

### 1. Creditar manualmente os 300 creditos para o usuario

Executar a RPC `add_lifetime_credits` para o usuario `2a9a0b2d-75ef-4cb5-9f01-98d1b2789a30` com 300 creditos e registrar na tabela `arcano_cloner_free_trials` para que nao possa reclamar novamente.

### 2. Remover o passo RunningHub do modal

No arquivo `src/components/ai-tools/AIToolsAuthModal.tsx`:

- Remover o step `'runninghub'` completamente
- O modal agora inicia direto no step `'email'`
- Remover toda a logica de countdown, referral URL do RunningHub
- Remover imports nao utilizados (`ExternalLink`, `Check`)
- Manter os steps: `email` -> `password` ou `signup` -> `verify-email`

### 3. Ajustar o header do modal

- Remover a mensagem sobre RunningHub
- Manter o texto "Ganhe 300 creditos gratis!" e "Faca login ou crie sua conta para comecar"

### Detalhes tecnicos

**Arquivo**: `src/components/ai-tools/AIToolsAuthModal.tsx`
- Tipo `ModalStep`: remover `'runninghub'`, manter `'email' | 'password' | 'signup' | 'verify-email'`
- Estado inicial do step: `'email'` em vez de `'runninghub'`
- Remover constantes `RUNNINGHUB_REFERRAL_URL`, `COUNTDOWN_SECONDS`
- Remover estados `countdown`, `countdownActive`
- Remover funcao `handleOpenRunningHub`
- Remover todo o bloco de renderizacao do step `'runninghub'` (linhas 286-367)
- Remover useEffect do countdown timer
- Atualizar subtitle do header para sempre mostrar "Faca login ou crie sua conta"
- Remover texto "Conta gratuita no RunningHub" dos beneficios

**Migracao SQL**: Inserir registro em `arcano_cloner_free_trials` e creditar 300 para o usuario edemar.
