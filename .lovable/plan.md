
# Plano: Migrar Upscaler para WebApp v2 + Webhook + Supabase Realtime

## Objetivo

Eliminar completamente o sistema de polling (status e fila), substituindo por:
1. **WebApp API v2** do RunningHub (novo endpoint)
2. **Webhook** para receber notificacao instantanea quando o upscale termina
3. **Supabase Realtime** para notificar o frontend em tempo real

---

## Reducao de Custos Estimada

| Componente | Polling Atual | Webhook + Realtime |
|------------|---------------|-------------------|
| Status do upscale | 18-30 chamadas/job | 1 webhook recebido |
| Fila | 18-54 queries/job | 0 queries |
| **Total por job** | ~40-80 operacoes | ~2 operacoes |
| **10 usuarios simultaneos** | ~400-800 ops | ~20 ops |
| **Reducao** | - | ~95% |

---

## Arquitetura Nova

```text
+------------------+     +-------------------+     +------------------+
|    FRONTEND      |     |   EDGE FUNCTION   |     |   RUNNINGHUB     |
| UpscalerArcano   |     | runninghub-upsc   |     |   WebApp API     |
|   Tool.tsx       |     |   aler/index.ts   |     |                  |
+------------------+     +-------------------+     +------------------+
        |                        |                        |
        | 1. Inicia upscale      |                        |
        |----------------------->|                        |
        |                        | 2. POST /run/ai-app    |
        |                        |    + webhookUrl        |
        |                        |----------------------->|
        |                        |                        |
        | 3. Retorna taskId      |<-----------------------|
        |<-----------------------|                        |
        |                        |                        |
        | 4. Subscribe Realtime  |                        |
        |   (upscaler_jobs:id)   |                        |
        |                        |                        |
        |                        |     (processando...)   |
        |                        |                        |
        |                        |                        |
        |                        |<-----------------------|
        |                        | 5. Webhook: TASK_END   |
        |                        |                        |
        |                        | 6. Update DB           |
        |                        |    (status, results)   |
        |                        |                        |
        | 7. Realtime broadcast  |                        |
        |   (status: completed,  |                        |
        |    output_url: ...)    |                        |
        |<-----------------------|                        |
        |                        |                        |
        | 8. Exibe resultado     |                        |
+------------------+     +-------------------+     +------------------+
```

---

## Mudancas no Banco de Dados

### Nova tabela: `upscaler_jobs`

Esta tabela substitui a `upscaler_queue` atual e armazena o estado completo de cada job.

```sql
CREATE TABLE upscaler_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  task_id TEXT,                    -- taskId do RunningHub
  status TEXT NOT NULL DEFAULT 'queued',  -- queued, running, completed, failed
  input_file_name TEXT,
  resolution INTEGER DEFAULT 4096,
  detail_denoise NUMERIC DEFAULT 0.15,
  prompt TEXT,
  output_url TEXT,                 -- URL da imagem processada
  error_message TEXT,
  position INTEGER,                -- posicao na fila (calculado)
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE upscaler_jobs;

-- RLS Policies
ALTER TABLE upscaler_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert jobs"
  ON upscaler_jobs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view jobs by session"
  ON upscaler_jobs FOR SELECT
  USING (true);

CREATE POLICY "Edge functions can update jobs"
  ON upscaler_jobs FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete own jobs"
  ON upscaler_jobs FOR DELETE
  USING (true);
```

### Remover tabela antiga

```sql
DROP TABLE IF EXISTS upscaler_queue;
```

---

## Nova Edge Function: `runninghub-webhook`

Recebe o callback do RunningHub quando o job termina.

### Endpoint
`POST /functions/v1/runninghub-webhook`

### Logica

```typescript
// supabase/functions/runninghub-webhook/index.ts

serve(async (req) => {
  // 1. Parse webhook payload
  const { event, eventData, taskId } = await req.json();
  
  // 2. Validar evento
  if (event !== 'TASK_END') {
    return new Response('OK', { status: 200 });
  }
  
  // 3. Extrair dados
  const { status, results, errorMessage } = eventData;
  const outputUrl = results?.[0]?.url || null;
  
  // 4. Atualizar job no banco
  await supabase
    .from('upscaler_jobs')
    .update({
      status: status === 'SUCCESS' ? 'completed' : 'failed',
      output_url: outputUrl,
      error_message: errorMessage || null,
      completed_at: new Date().toISOString()
    })
    .eq('task_id', taskId);
  
  // 5. Se havia fila, iniciar proximo job
  await processNextInQueue();
  
  return new Response('OK', { status: 200 });
});
```

---

## Modificacoes na Edge Function Existente: `runninghub-upscaler`

### Mudancas principais:

1. **Nova API v2** - Endpoints e headers atualizados
2. **Adicionar webhookUrl** no request
3. **Remover endpoints /status e /outputs** - nao sao mais necessarios
4. **Novo parametro: prompt** - opcional

### Novo formato do request (API v2):

```typescript
const WEBAPP_ID = '2015865378030755841';
const WEBHOOK_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/runninghub-webhook`;

// Endpoint: POST https://www.runninghub.ai/openapi/v2/run/ai-app/{webappId}
// Headers: Authorization: Bearer ${API_KEY}

const requestBody = {
  nodeInfoList: [
    { nodeId: "input", fieldName: "image", fieldValue: fileName },
    { nodeId: "detail", fieldName: "value", fieldValue: detailDenoise },
    { nodeId: "prompt", fieldName: "text", fieldValue: prompt || "" }
  ],
  instanceType: "default",
  usePersonalQueue: false,
  webhookUrl: WEBHOOK_URL  // NOVO: Callback quando terminar
};
```

### Endpoints da Edge Function:

| Endpoint | Acao |
|----------|------|
| `/upload` | Manter (upload de imagem) |
| `/run` | Atualizar para API v2 + webhook |
| `/status` | REMOVER (webhook substitui) |
| `/outputs` | REMOVER (webhook substitui) |
| `/queue-status` | NOVO: retorna posicao na fila via DB |

---

## Modificacoes no Frontend: `UpscalerArcanoTool.tsx`

### Remover:
- Estado `creativityDenoise` e UI relacionada
- `pollingRef` e toda logica de polling de status
- `queuePollingRef` e logica de polling de fila
- Constantes `QUEUE_POLLING_INTERVAL`, `initialDelay`, `pollingInterval`

### Adicionar:

1. **Estados para prompt:**
```typescript
const [useCustomPrompt, setUseCustomPrompt] = useState(false);
const [customPrompt, setCustomPrompt] = useState(
  "high quality realistic photography with extremely detailed skin texture..."
);
```

2. **Subscribe Realtime:**
```typescript
useEffect(() => {
  if (!jobId) return;
  
  const channel = supabase
    .channel(`job-${jobId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'upscaler_jobs',
        filter: `id=eq.${jobId}`
      },
      (payload) => {
        const job = payload.new;
        if (job.status === 'completed') {
          setOutputImage(job.output_url);
          setStatus('completed');
          toast.success(t('upscalerTool.toast.success'));
        } else if (job.status === 'failed') {
          setStatus('error');
          setLastError({ message: job.error_message });
        } else if (job.status === 'running') {
          setStatus('processing');
        }
        setQueuePosition(job.position || 0);
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}, [jobId]);
```

3. **Novo fluxo de processamento:**
```typescript
const processImage = async () => {
  // 1. Criar job no banco
  const { data: job } = await supabase
    .from('upscaler_jobs')
    .insert({
      session_id: sessionIdRef.current,
      status: 'queued',
      resolution,
      detail_denoise: detailDenoise,
      prompt: useCustomPrompt ? customPrompt : null
    })
    .select()
    .single();
  
  setJobId(job.id);
  
  // 2. Upload da imagem
  const uploadResponse = await supabase.functions.invoke('runninghub-upscaler/upload', { ... });
  
  // 3. Iniciar processamento
  const runResponse = await supabase.functions.invoke('runninghub-upscaler/run', {
    body: {
      jobId: job.id,
      fileName: uploadResponse.data.fileName,
      resolution,
      detailDenoise,
      prompt: useCustomPrompt ? customPrompt : null
    }
  });
  
  // 4. Aguardar via Realtime (ja configurado no useEffect)
  setStatus('processing');
};
```

4. **Nova UI de prompt:**
```tsx
{/* Card de Prompt Personalizado */}
<Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-4">
  <div className="flex items-center justify-between mb-3">
    <label className="text-sm font-medium text-purple-200">
      {t('upscalerTool.controls.usePrompt')}
    </label>
    <Switch
      checked={useCustomPrompt}
      onCheckedChange={setUseCustomPrompt}
    />
  </div>
  
  {useCustomPrompt && (
    <Textarea
      value={customPrompt}
      onChange={(e) => setCustomPrompt(e.target.value)}
      placeholder={t('upscalerTool.controls.promptPlaceholder')}
      className="min-h-[100px] bg-[#0D0221]/50 border-purple-500/30"
    />
  )}
</Card>
```

---

## Gerenciamento de Fila

### Logica na edge function `runninghub-upscaler/run`:

```typescript
async function handleRun(req: Request) {
  const { jobId, fileName, resolution, detailDenoise, prompt } = await req.json();
  
  // 1. Verificar quantos jobs estao rodando
  const { count: runningCount } = await supabase
    .from('upscaler_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'running');
  
  if (runningCount >= MAX_CONCURRENT_JOBS) {
    // Calcular posicao na fila
    const { count: aheadOfMe } = await supabase
      .from('upscaler_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'queued')
      .lt('created_at', job.created_at);
    
    // Atualizar posicao no job
    await supabase
      .from('upscaler_jobs')
      .update({ position: (aheadOfMe || 0) + 1 })
      .eq('id', jobId);
    
    return { queued: true, position: (aheadOfMe || 0) + 1 };
  }
  
  // 2. Processar imediatamente
  await supabase
    .from('upscaler_jobs')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', jobId);
  
  // 3. Chamar RunningHub API v2
  const response = await fetch(
    `https://www.runninghub.ai/openapi/v2/run/ai-app/${WEBAPP_ID}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RUNNINGHUB_API_KEY}`
      },
      body: JSON.stringify({
        nodeInfoList: [...],
        webhookUrl: WEBHOOK_URL,
        instanceType: 'default'
      })
    }
  );
  
  const data = await response.json();
  
  // 4. Salvar taskId
  await supabase
    .from('upscaler_jobs')
    .update({ task_id: data.taskId })
    .eq('id', jobId);
  
  return { success: true, taskId: data.taskId };
}
```

### Processar proximo da fila (no webhook):

```typescript
async function processNextInQueue() {
  // Verificar se ha vaga
  const { count: runningCount } = await supabase
    .from('upscaler_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'running');
  
  if (runningCount >= MAX_CONCURRENT_JOBS) return;
  
  // Buscar proximo da fila
  const { data: nextJob } = await supabase
    .from('upscaler_jobs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  
  if (!nextJob) return;
  
  // Iniciar processamento
  await startProcessing(nextJob);
}
```

---

## Traducoes

### `src/locales/pt/tools.json`

```json
{
  "upscalerTool": {
    "controls": {
      "usePrompt": "Usar Prompt Personalizado",
      "promptPlaceholder": "Descreva como a imagem deve ser melhorada...",
      "promptHint": "Ative para guiar a IA com uma descricao",
      "defaultPrompt": "high quality realistic photography with extremely detailed skin texture and pores visible, realistic lighting, detailed eyes, professional photo"
    }
  }
}
```

### `src/locales/es/tools.json` (se existir)

```json
{
  "upscalerTool": {
    "controls": {
      "usePrompt": "Usar Prompt Personalizado",
      "promptPlaceholder": "Describe como debe mejorarse la imagen...",
      "promptHint": "Activa para guiar la IA con una descripcion",
      "defaultPrompt": "high quality realistic photography with extremely detailed skin texture and pores visible, realistic lighting, detailed eyes, professional photo"
    }
  }
}
```

---

## Arquivos a Modificar/Criar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/runninghub-webhook/index.ts` | CRIAR - Nova edge function |
| `supabase/functions/runninghub-upscaler/index.ts` | REESCREVER - API v2 + webhook |
| `supabase/config.toml` | ADICIONAR - config webhook |
| `src/pages/UpscalerArcanoTool.tsx` | MODIFICAR - Realtime + Prompt |
| `src/locales/pt/tools.json` | ADICIONAR - strings prompt |
| Database migration | CRIAR - nova tabela upscaler_jobs |

---

## Sequencia de Implementacao

### Fase 1: Infraestrutura (sem quebrar o atual)
1. Criar tabela `upscaler_jobs` no banco
2. Habilitar Realtime na tabela
3. Criar edge function `runninghub-webhook`
4. Adicionar config no `supabase/config.toml`

### Fase 2: Edge Function
5. Atualizar `runninghub-upscaler` para API v2
6. Adicionar webhookUrl no request
7. Remover endpoints /status e /outputs

### Fase 3: Frontend
8. Remover polling e estados relacionados
9. Adicionar subscribe Realtime
10. Adicionar UI de prompt
11. Atualizar fluxo de processamento

### Fase 4: Limpeza
12. Remover tabela `upscaler_queue` antiga
13. Testar end-to-end

---

## Consideracoes de Seguranca

1. **Webhook Validation**: Validar que o request vem do RunningHub (IP whitelist ou token secreto)
2. **RLS**: Policies permissivas pois nao ha autenticacao no upscaler
3. **Cleanup**: Criar funcao para limpar jobs antigos (>1 hora)

---

## Fallback

Se o webhook falhar (timeout, erro de rede), implementar um job de limpeza que:
1. Verifica jobs "running" ha mais de 10 minutos
2. Consulta status na API do RunningHub
3. Atualiza o banco se necessario

Isso garante que nenhum job fique "preso" mesmo se o webhook falhar.
