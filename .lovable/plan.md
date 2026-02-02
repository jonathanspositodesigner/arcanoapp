
# Plano: Motor do Pose Changer com RunningHub

## Arquitetura Proposta

Replicar a mesma arquitetura robusta do Upscaler Arcano para o Pose Changer, adaptando para o endpoint da API do Pose Changer.

```text
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│  Edge Function       │────▶│  RunningHub     │
│  PoseChanger    │     │  pose-changer        │     │  WebApp API     │
│  Tool.tsx       │◀────│                      │◀────│                 │
└────────┬────────┘     └──────────────────────┘     └─────────────────┘
         │                        │
         │ Realtime               │ Webhook
         │                        ▼
         │              ┌──────────────────────┐
         └──────────────│   pose_changer_jobs  │
                        │   (tabela DB)        │
                        └──────────────────────┘
```

---

## 1. Migração SQL - Nova Tabela

Criar tabela `pose_changer_jobs` similar à `upscaler_jobs`:

```sql
CREATE TABLE public.pose_changer_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  task_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  
  -- Input files (RunningHub filenames after upload)
  person_file_name TEXT,
  reference_file_name TEXT,
  
  -- Output
  output_url TEXT,
  error_message TEXT,
  position INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Index for queue processing
CREATE INDEX idx_pose_changer_jobs_status ON pose_changer_jobs(status);
CREATE INDEX idx_pose_changer_jobs_session ON pose_changer_jobs(session_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE pose_changer_jobs;

-- RLS Policies
ALTER TABLE pose_changer_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs" ON pose_changer_jobs
  FOR SELECT USING (session_id = current_setting('request.headers')::json->>'x-session-id' 
                    OR user_id = auth.uid());

CREATE POLICY "Anyone can insert jobs" ON pose_changer_jobs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update jobs" ON pose_changer_jobs
  FOR UPDATE USING (true);
```

---

## 2. Edge Function: `runninghub-pose-changer`

Nova Edge Function com 3 endpoints (mesmo padrão do upscaler):

| Endpoint | Descrição |
|----------|-----------|
| `/upload` | Upload de imagem para RunningHub |
| `/run` | Iniciar job (com fila e webhook) |
| `/queue-status` | Consultar status do job |

### Fluxo do `/run`:

1. Validar parâmetros (jobId, personImageUrl, referenceImageUrl, userId, creditCost)
2. Download das imagens do Storage e upload para RunningHub
3. Consumir créditos via `consume_upscaler_credits` (reutilizar mesma função)
4. Verificar slots disponíveis (MAX_CONCURRENT_JOBS = 3)
5. Se fila cheia: marcar como `queued` com posição
6. Se slot disponível: chamar API RunningHub com webhook

### API RunningHub para Pose Changer:

```typescript
// WebApp ID do Pose Changer
const WEBAPP_ID_POSE = '2018451429635133442';

// NodeInfoList conforme documentação
const nodeInfoList = [
  { nodeId: "27", fieldName: "image", fieldValue: personFileName },
  { nodeId: "60", fieldName: "image", fieldValue: referenceFileName }
];

// Request
const requestBody = {
  nodeInfoList,
  instanceType: "default",
  usePersonalQueue: false,
  webhookUrl: `${SUPABASE_URL}/functions/v1/runninghub-webhook`
};

// POST https://www.runninghub.ai/openapi/v2/run/ai-app/${WEBAPP_ID_POSE}
// Headers: Authorization: Bearer ${RUNNINGHUB_API_KEY}
```

---

## 3. Atualizar Webhook Existente

Modificar `runninghub-webhook` para suportar ambos os jobs:

```typescript
// Tentar encontrar em upscaler_jobs primeiro
let job = await supabase.from('upscaler_jobs').select().eq('task_id', taskId).single();

// Se não encontrou, tentar pose_changer_jobs
if (!job.data) {
  job = await supabase.from('pose_changer_jobs').select().eq('task_id', taskId).single();
}

// Atualizar a tabela correta
const tableName = job.table; // determinar qual tabela
```

Ou criar webhook separado: `runninghub-pose-webhook`

---

## 4. Atualizar Frontend: `PoseChangerTool.tsx`

### Adicionar Estados:

```typescript
// Queue state
const [isWaitingInQueue, setIsWaitingInQueue] = useState(false);
const [queuePosition, setQueuePosition] = useState(0);
const [jobId, setJobId] = useState<string | null>(null);

// Session
const sessionIdRef = useRef<string>('');
const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
```

### Novo Fluxo `handleProcess`:

```typescript
const handleProcess = async () => {
  // 1. Validar imagens e créditos
  // 2. Criar job na tabela pose_changer_jobs
  // 3. Upload person image para Storage
  // 4. Upload reference image para Storage
  // 5. Chamar Edge Function com URLs
  // 6. Subscrever Realtime para atualizações
};
```

### Adicionar Realtime Subscription:

```typescript
useEffect(() => {
  if (!jobId) return;
  
  const channel = supabase
    .channel(`pose-job-${jobId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'pose_changer_jobs',
      filter: `id=eq.${jobId}`
    }, (payload) => {
      // Atualizar UI baseado no status
    })
    .subscribe();
    
  return () => supabase.removeChannel(channel);
}, [jobId]);
```

### Adicionar Recovery de Jobs Pendentes:

```typescript
useEffect(() => {
  const checkPendingJob = async () => {
    const { data: pendingJob } = await supabase
      .from('pose_changer_jobs')
      .select('*')
      .eq('session_id', sessionIdRef.current)
      .in('status', ['queued', 'running'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (pendingJob) {
      setJobId(pendingJob.id);
      setStatus('processing');
      // ... recuperar estado
    }
  };
  
  checkPendingJob();
}, []);
```

---

## 5. Componentes de UI para Fila

Reutilizar o mesmo padrão visual do Upscaler:

- Mensagens de fila amigáveis (emoji + texto)
- Barra de progresso
- Botão "Sair da Fila"
- Warning banner durante processamento

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `pose_changer_jobs` (migração) | Criar tabela + RLS + Realtime |
| `supabase/functions/runninghub-pose-changer/index.ts` | Criar edge function |
| `supabase/config.toml` | Adicionar nova função |
| `supabase/functions/runninghub-webhook/index.ts` | Atualizar para suportar pose jobs |
| `src/pages/PoseChangerTool.tsx` | Adicionar motor completo |

---

## Custo de Créditos

O Pose Changer usará os mesmos créditos do Upscaler:
- **60 créditos** por processamento

Reutiliza as funções existentes:
- `consume_upscaler_credits`
- `get_upscaler_credits`
- `useUpscalerCredits` hook

---

## Detalhes Técnicos Importantes

### Rate Limiting
Aplicar mesmo rate limit do upscaler:
- Upload: 10 req/min
- Run: 5 req/min

### Validações
- Validar URLs são do Supabase Storage
- Validar userId é UUID válido
- Validar creditCost é número 1-500

### Session Recovery
Salvar `pose_session_id` separado no localStorage para não conflitar com upscaler.

### Timeout
Jobs que ficam `running` por mais de 10 minutos devem ser marcados como `failed` (cleanup function existente pode ser adaptada).
