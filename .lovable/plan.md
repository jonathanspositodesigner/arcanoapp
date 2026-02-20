

## Problema

O modal `LandingTrialExpiredModal` tem um bug na logica de verificacao: ele usa uma flag `hasChecked` que impede a re-verificacao quando o saldo muda durante o uso.

**O que acontece hoje:**
1. Usuario entra na pagina com creditos > 0
2. O `useEffect` ve que `balance > 0` e nao faz nada
3. Usuario gasta todos os creditos, `balance` vira 0
4. O `useEffect` roda de novo, mas `hasChecked` ja e `true` (ficou true na primeira vez), entao sai imediatamente sem verificar

**Ou seja:** o modal so aparece se o usuario JA entrar na pagina com saldo zero. Se o saldo zerar durante o uso, o modal nunca aparece.

## Solucao

Remover a flag `hasChecked` e mudar a logica para:
- Quando `balance` mudar para 0, sempre verificar se o usuario e do landing trial
- Usar uma ref para evitar chamadas duplicadas simultaneas (debounce), mas permitir re-verificacao quando o balance muda
- Tambem reagir ao `balance` mudando de positivo para zero (transicao especifica)

## Detalhes Tecnicos

**Arquivo:** `src/components/arcano-cloner/LandingTrialExpiredModal.tsx`

Mudancas:
1. Remover o estado `hasChecked`
2. Adicionar uma ref `prevBalanceRef` para detectar quando o saldo transiciona de >0 para 0
3. Quando `balance === 0` e o balance anterior era > 0, chamar a RPC `check_landing_trial_status`
4. Tambem verificar no mount inicial se `balance === 0`
5. Apos o `refetchCredits` no `ArcanoClonerTool.tsx` (quando job completa ou falha), o `balance` atualiza automaticamente, o que vai disparar o efeito no modal

Isso garante que o modal apareca **imediatamente** quando os creditos zerarem durante o uso da ferramenta.

