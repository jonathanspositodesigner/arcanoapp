

## Correcao: Modal "Sem Creditos" aparece mesmo com saldo alto

### Problema

O hook `useUpscalerCredits` inicializa `balance = 0`. Quando o usuario abre uma ferramenta, o fluxo e:

1. Primeiro render: `user` ainda nao carregou -> `userId = undefined` -> hook seta `balance = 0` e `isLoading = false`
2. Auth carrega: `userId` muda para o ID real -> hook chama `fetchBalance()` assincronamente
3. Se o usuario clica "Gerar" ANTES do fetch terminar, `credits = 0` (valor stale) -> `0 < 80` -> modal de "sem creditos"

O header mostra os creditos porque o hook dele ja completou o fetch. Mas o hook da pagina da ferramenta pode estar num estado diferente.

### Solucao

Adicionar um metodo `checkBalance()` no hook `useUpscalerCredits` que faz uma consulta **sincrona** (await) ao banco e retorna o valor fresco. Trocar o check `if (credits < creditCost)` em todas as ferramentas por `const freshCredits = await checkBalance(); if (freshCredits < creditCost)`.

### Mudancas

#### 1. Hook: `src/hooks/useUpscalerCredits.tsx`

Adicionar nova funcao `checkBalance` que:
- Chama a RPC `get_upscaler_credits` com await
- Atualiza o state `balance` com o valor retornado
- Retorna o valor fresco diretamente

```text
const checkBalance = useCallback(async (): Promise<number> => {
  if (!userId) return 0;
  const { data } = await supabase.rpc('get_upscaler_credits', { _user_id: userId });
  const fresh = data ?? 0;
  setBalance(fresh);
  return fresh;
}, [userId]);
```

Expor no return: `checkBalance`

#### 2. Todas as 6 ferramentas - trocar check de creditos stale por fresh

| Arquivo | Linhas | Mudanca |
|---------|--------|---------|
| `src/pages/ArcanoClonerTool.tsx` | ~47, ~376 | Desestruturar `checkBalance`, usar `await checkBalance()` |
| `src/pages/UpscalerArcanoTool.tsx` | ~98, ~489 | Idem |
| `src/pages/PoseChangerTool.tsx` | ~47, ~319 | Idem |
| `src/pages/VesteAITool.tsx` | ~43, ~319 | Idem |
| `src/pages/VideoUpscalerTool.tsx` | ~44, ~271 | Idem |
| `src/pages/GeradorPersonagemTool.tsx` | ~50, ~255, ~390 | Idem (tem 2 checks: geracao + refinamento) |

Em cada ferramenta, o padrao muda de:

```text
// ANTES (usa valor stale do state)
if (credits < creditCost) {
  setNoCreditsReason('insufficient');
  setShowNoCreditsModal(true);
  endSubmit();
  return;
}
```

Para:

```text
// DEPOIS (busca valor fresco do banco)
const freshCredits = await checkBalance();
if (freshCredits < creditCost) {
  setNoCreditsReason('insufficient');
  setShowNoCreditsModal(true);
  endSubmit();
  return;
}
```

### Resumo

- 1 mudanca no hook (adicionar `checkBalance`)
- 7 checks corrigidos em 6 arquivos
- Nenhum arquivo novo
- O backend continua validando tambem (dupla seguranca)

