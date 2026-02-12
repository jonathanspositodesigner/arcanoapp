
# Fila Exclusiva para Gerar Video (Google Veo API) -- max 2 simultaneos

## Garantia de isolamento

Esta fila e **100% separada** de tudo que existe. Nao mexe em:
- `runninghub-queue-manager` (fila das outras ferramentas)
- Nenhuma outra Edge Function existente
- Nenhuma tabela de outras ferramentas (upscaler, pose, veste, cloner, avatar)
- Nenhum webhook existente

Toda a logica fica contida em **3 arquivos** que ja existem e pertencem exclusivamente ao Gerar Video:
1. `video_generator_jobs` (tabela -- adicionar campo `job_payload`)
2. `supabase/functions/generate-video/index.ts`
3. `supabase/functions/poll-video-status/index.ts`
4. `src/pages/GerarVideoTool.tsx`

## Como funciona

```text
Usuario clica "Gerar Video"
       |
       v
  generate-video conta jobs com status "processing"
  e started_at nos ultimos 60s
       |
       +---> < 2 ativos: chama Google API, cria job "processing" (fluxo atual, nada muda)
       |
       +---> >= 2 ativos: salva dados no job como "queued", retorna { queued: true, position }
                |
                v
           Frontend mostra "Voce esta na fila (posicao X)"
           Inicia polling normal (poll-video-status)
                |
                v
           poll-video-status detecta job "queued":
             - Conta jobs "processing" ativos
             - Se < 2 E este job e o mais antigo queued:
               chama Google API, atualiza para "processing"
             - Se nao: retorna { status: "queued", position: N }
                |
                v
           Quando job vira "processing", polling continua
           verificando a operacao no Google (fluxo atual intacto)
```

## Detalhes Tecnicos

### 1. Migracao SQL

Adicionar coluna `job_payload` (jsonb) na tabela `video_generator_jobs` para salvar os dados do request quando o job e enfileirado:

```sql
ALTER TABLE video_generator_jobs ADD COLUMN IF NOT EXISTS job_payload jsonb;
```

A coluna `position` ja existe na tabela (adicionada em migracao anterior). Nao precisa criar.

### 2. Edge Function `generate-video/index.ts`

Antes de chamar a API do Google, adicionar verificacao:

```typescript
// Contar jobs ativos (processing nos ultimos 60s)
const oneMinAgo = new Date(Date.now() - 60000).toISOString();
const { count: activeCount } = await serviceClient
  .from("video_generator_jobs")
  .select("id", { count: "exact", head: true })
  .eq("status", "processing")
  .gte("started_at", oneMinAgo);

if ((activeCount || 0) >= 2) {
  // Contar posicao na fila
  const { count: queuedCount } = await serviceClient
    .from("video_generator_jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "queued");

  const position = (queuedCount || 0) + 1;

  // Salvar job como queued COM payload completo
  const { data: jobData } = await serviceClient
    .from("video_generator_jobs")
    .insert({
      user_id: userId,
      prompt: prompt.trim(),
      aspect_ratio: ratio,
      duration_seconds: duration,
      status: "queued",
      position: position,
      user_credit_cost: creditCost,
      credits_charged: true,
      job_payload: { prompt, aspect_ratio: ratio, duration, start_frame, end_frame },
    })
    .select("id")
    .single();

  return { queued: true, job_id: jobData.id, position };
}

// Se < 2: fluxo atual intacto (chamar Google, criar job "processing")
```

### 3. Edge Function `poll-video-status/index.ts`

Adicionar bloco ANTES da verificacao de `operation_name` para tratar jobs "queued":

```typescript
if (job.status === "queued") {
  // Verificar se ha slot livre
  const oneMinAgo = new Date(Date.now() - 60000).toISOString();
  const { count: activeCount } = await serviceClient
    .from("video_generator_jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "processing")
    .gte("started_at", oneMinAgo);

  if ((activeCount || 0) >= 2) {
    // Calcular posicao atual na fila
    const { count: ahead } = await serviceClient
      .from("video_generator_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "queued")
      .lt("created_at", job.created_at);

    return { status: "queued", position: (ahead || 0) + 1 };
  }

  // Verificar se este e o proximo da fila (FIFO)
  const { data: nextInQueue } = await serviceClient
    .from("video_generator_jobs")
    .select("id")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (nextInQueue?.id !== job.id) {
    // Nao e a vez deste job
    const { count: ahead } = ...
    return { status: "queued", position: (ahead || 0) + 1 };
  }

  // E a vez! Chamar Google API com dados do job_payload
  const payload = job.job_payload;
  // ... montar request e chamar Veo API ...
  // Se sucesso: atualizar job para "processing" com operation_name
  // Se erro do Google: marcar como "failed", estornar creditos
}
```

Se o Google retornar erro ao iniciar (ex: 429 rate limit), o job vai para "failed" com estorno -- **nunca fica preso**.

### 4. Frontend `GerarVideoTool.tsx`

Adicionar estados e UI para fila:

```typescript
const [isQueued, setIsQueued] = useState(false);
const [queuePosition, setQueuePosition] = useState(0);
```

No `handleGenerate`, tratar resposta `queued`:
```typescript
if (data.queued) {
  setIsQueued(true);
  setQueuePosition(data.position);
  setJobId(data.job_id);
  setIsPolling(true);
  pollingStartRef.current = Date.now();
  toast.info(`Voce esta na fila (posicao ${data.position})`);
  return;
}
```

No `pollStatus`, tratar status "queued" e transicao para "processing":
```typescript
if (data.status === 'queued') {
  setQueuePosition(data.position);
  setIsQueued(true);
} else if (data.status === 'processing') {
  setIsQueued(false); // saiu da fila, agora esta processando
}
```

UI de fila (substitui o loading generico quando `isQueued`):
```tsx
{isQueued ? (
  <div className="flex flex-col items-center gap-4">
    <Loader2 className="h-8 w-8 animate-spin text-fuchsia-400" />
    <p className="text-white font-medium">Voce esta na fila</p>
    <p className="text-purple-400 text-sm">Posicao {queuePosition} - Aguarde...</p>
    <p className="text-purple-500 text-xs">Sua geracao sera processada em breve</p>
  </div>
) : (
  // loading atual de "Gerando video..."
)}
```

Tratamento de erro: se `status: "failed"` vindo do poll, mostrar mensagem + botao "Tentar novamente" (ja existe parcialmente).

### Resumo dos arquivos tocados

| Arquivo | Acao |
|---------|------|
| `video_generator_jobs` (migration) | Adicionar coluna `job_payload` |
| `generate-video/index.ts` | Adicionar verificacao de slots antes de chamar Google |
| `poll-video-status/index.ts` | Adicionar logica de dequeue para jobs "queued" |
| `GerarVideoTool.tsx` | Adicionar UI de fila e tratar status "queued" |

**Nenhum outro arquivo sera tocado. Zero risco para as outras ferramentas.**
