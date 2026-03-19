

## Diagnóstico completo

### O que o banco diz
- **Saldo real da Dayane agora**: 2.685 créditos (lifetime_balance=2685, monthly=0)
- Última transação: 19/mar 11:41 UTC (-80, Gerador de Personagem)
- Não houve zeragem real — o saldo está correto no banco

### Por que ela vê "0" na tela
Bug no hook `useUpscalerCredits.tsx`:
1. O estado inicial de `balance` é `useState(0)`
2. `fetchBalance` chama 2 RPCs sequenciais (`expire_landing_trial_credits` + `get_upscaler_credits_breakdown`)
3. Se **qualquer um falhar** (timeout, rede instável no celular, pool de conexões esgotado), o `catch` faz retry até 2x
4. Se todos os retries falharem, o `finally` marca `isLoading = false` — mas `balance` continua no valor inicial **0**
5. A UI mostra "0" com confiança total, sem indicar erro

Isso é especialmente comum no celular com rede 4G instável.

### Bug secundário: cliques duplos no Refinar (confirmado)
- `handleRefine` no `GeradorPersonagemTool.tsx` não usa `startSubmit()` no início
- Usa apenas `setIsRefining(true)` que é assíncrono
- Dayane perdeu 225 créditos com 3 episódios de clique duplo (05:02, 05:05x2)
- Nenhum outro usuário afetado nos últimos 30 dias
- Mesmo padrão vulnerável existe em `ArcanoClonerTool.tsx` e `FlyerMakerTool.tsx`

---

## Plano de correção

### 1. Corrigir exibição de saldo 0 falso (`useUpscalerCredits.tsx`)
- Não sobrescrever `balance` com 0 quando o fetch falha
- Adicionar estado `hasError` para saber se o último fetch falhou
- Se falhou: manter o último saldo conhecido e mostrar indicador visual de erro/retry
- Se `isLoading` terminar sem dados bem-sucedidos, manter valor anterior (não 0)

### 2. Proteção anti-clique-duplo no `handleRefine` (3 arquivos)
- **`GeradorPersonagemTool.tsx`**: Adicionar `if (!startSubmit()) return;` no início de `handleRefine` + `endSubmit()` nos pontos de saída
- **`ArcanoClonerTool.tsx`**: Mesma correção
- **`FlyerMakerTool.tsx`**: Mesma correção

### 3. Estornar 225 créditos para Dayane
- Executar `refund_upscaler_credits` com 225 créditos vitalícios
- Descrição: "Estorno: cobranças duplicadas por clique múltiplo em Refinar Avatar"

### Arquivos a alterar
- `src/hooks/useUpscalerCredits.tsx` — lógica de fallback quando fetch falha
- `src/pages/GeradorPersonagemTool.tsx` — guard em `handleRefine`
- `src/pages/ArcanoClonerTool.tsx` — guard em `handleRefine`
- `src/pages/FlyerMakerTool.tsx` — guard em `handleRefine`
- Migration SQL para estorno da Dayane

