

## Correcao: Carrossel de Refinamento Nao Aparece

### Problema

Na linha 163 de `GeradorPersonagemTool.tsx`, o `useCallback` do `onStatusChange` nao inclui `isRefining` nas dependencias:

```text
}, [endSubmit, playNotificationSound, refetchCredits]),
```

O callback sempre ve `isRefining = false`, entao todo resultado e tratado como "Original", resetando o historico. O carrossel nunca aparece porque o historico nunca passa de 1 item.

### Correcao

Uma unica linha -- adicionar `isRefining` ao array de dependencias:

```text
}, [endSubmit, playNotificationSound, refetchCredits, isRefining]),
```

### Arquivo

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/GeradorPersonagemTool.tsx` | Linha 163: adicionar `isRefining` ao array de dependencias do useCallback |

Mudanca de 1 linha. Nenhum arquivo novo.

