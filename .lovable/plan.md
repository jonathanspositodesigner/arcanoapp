

## Diagnóstico: Por que o Remover Fundo demora para trazer resultado

### Causa raiz

O hook `useJobStatusSync` tem um bug de dependências instáveis no `useEffect` principal (linha 334). As callbacks `processUpdate`, `pollJobStatus`, `handleVisibilityChange` e `cleanup` são todas `useCallback` mas dependem de `onStatusChange`, que é passado inline (sem `useCallback`) por TODAS as ferramentas.

Consequência: a cada re-render (causado pela barra de progresso que atualiza a cada 1s), o efeito faz cleanup total e reconfigura tudo do zero:

1. A subscription Realtime desconecta e reconecta a cada ~3s (visível nos logs: `SUBSCRIBED → CLOSED → SUBSCRIBED`)
2. O timer de backup polling (5s delay) **nunca dispara** porque é resetado antes dos 5s
3. O endpoint `/check` é chamado a cada re-setup (dezenas de vezes por minuto)
4. Na janela de desconexão do Realtime, o webhook pode chegar e ser perdido

Isso afeta TODAS as ferramentas, mas o efeito é mais visível no bg-remover por ter processamento curto.

### Correção

Estabilizar as dependências do `useEffect` em `useJobStatusSync` usando refs para os callbacks:

**Arquivo: `src/hooks/useJobStatusSync.ts`**

1. Criar refs para `onStatusChange` e `onGlobalStatusChange` (atualizam silenciosamente sem disparar o effect)
2. Usar essas refs dentro de `processUpdate` para que ele não precise da callback diretamente no dependency array
3. Simplificar o dependency array do effect para apenas `[enabled, jobId, toolType, tableName]` — valores estáveis

```text
ANTES (instável):
  onStatusChange (inline) 
    → processUpdate muda
      → pollJobStatus muda  
        → handleVisibilityChange muda
          → cleanup muda
            → useEffect re-executa (loop infinito ~1-3s)

DEPOIS (estável):
  onStatusChangeRef.current = onStatusChange  (ref, sem re-render)
  processUpdate usa ref internamente
  useEffect depende só de [enabled, jobId, toolType, tableName]
  → Executa UMA vez por job, sem loops
```

### Mudanças específicas

1. **`src/hooks/useJobStatusSync.ts`**: Refatorar para usar refs nos callbacks. Mover `processUpdate`, `pollJobStatus`, `handleVisibilityChange` e `cleanup` para dentro do efeito ou usar refs estáveis. Isso elimina o loop de re-subscribe.

Resultado: subscription Realtime fica estável, polling de backup funciona de verdade, e o resultado chega assim que o webhook dispara (sem janelas de desconexão).

### Impacto

Essa correção melhora TODAS as ferramentas de IA, não só o Remover Fundo. Mas o efeito principal será sentido no bg-remover onde o processamento é rápido e a demora era causada quase inteiramente pelo loop de re-subscribe.

