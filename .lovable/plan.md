

## Solucao Definitiva: Timer de 10 Minutos no useJobStatusSync

### O problema (simples e direto)
O polling do `useJobStatusSync` **para depois de 3 minutos** (`MAX_DURATION_MS: 180000`). Depois disso, se o Realtime cair, NINGUEM mais verifica o status. O job fica orfao pra sempre.

### A solucao (simples e direta)
Modificar **um unico arquivo**: `src/hooks/useJobStatusSync.ts`

Adicionar um **timer absoluto de 10 minutos** que:
1. Inicia junto com o job
2. Quando dispara, faz uma ultima consulta ao banco
3. Se o job ainda estiver em qualquer status nao-terminal (`pending`, `queued`, `running`, `starting`), forca `onStatusChange({ status: 'failed', errorMessage: 'Tempo limite excedido...' })`
4. Para tudo (polling, realtime, timer)

Alem disso, aumentar o polling para **nao parar em 3 minutos** -- ele continua ate o timer de 10 min decidir:
- `MAX_DURATION_MS`: de 180000 (3 min) para 600000 (10 min)
- `INITIAL_DELAY_MS`: de 15000 (15s) para 5000 (5s) -- comecar a verificar mais cedo

### Mudancas no arquivo

**`src/hooks/useJobStatusSync.ts`**

```typescript
const POLLING_CONFIG = {
  INITIAL_DELAY_MS: 5000,    // 5s (era 15s) - verificar mais cedo
  INTERVAL_MS: 5000,         // 5s entre polls (sem mudanca)
  MAX_DURATION_MS: 600000,   // 10 min (era 3 min) - polling acompanha o timer
} as const;

// Timer absoluto de seguranca
const ABSOLUTE_TIMEOUT_MS = 600000; // 10 minutos
```

Adicionar dentro do hook:
- Uma ref `absoluteTimeoutRef` para o timer de 10 min
- No effect principal, iniciar o timer junto com Realtime e polling
- Quando o timer dispara:
  1. Faz `pollJobStatus()` uma ultima vez
  2. Espera 2s
  3. Se `isCompletedRef` ainda for `false`, dispara `onStatusChange` com status `failed` e mensagem "Tempo limite de processamento excedido (10 min). Seus creditos serao estornados automaticamente."
- No cleanup, limpar o timer tambem
- Quando `isCompletedRef` vira `true` (job concluiu/falhou/cancelou normalmente), limpar o timer

### Por que isso resolve TUDO
- **Job recebeu status de falha**: o `onStatusChange` ja trata isso (endSubmit, toast, etc.) -- funciona hoje
- **Job recebeu status de sucesso**: idem, ja funciona
- **Job NAO recebeu nenhum status**: o timer de 10 min garante que a UI e liberada, o usuario ve uma mensagem de erro, e o botao e destravado
- **Funciona para TODAS as ferramentas** (Upscaler, PoseChanger, VesteAI, VideoUpscaler, ArcanoCloner) porque todas usam o mesmo hook

### Resultado
- Nenhum job fica orfao por mais de 10 minutos. Nunca mais. Zero excecoes.
- Sem cron job, sem endpoint extra, sem botao manual
- Uma unica mudanca, em um unico arquivo, que protege todas as 5 ferramentas
