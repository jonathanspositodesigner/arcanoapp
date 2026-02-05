

# Plano: Sistema de Logs e Diagnóstico para Jobs de IA

## Objetivo

Implementar observabilidade completa no sistema de fila/jobs de IA, permitindo:
1. Identificar rapidamente onde e por que um job falhou
2. Ver o histórico de etapas executadas por cada job
3. Acessar erros brutos da RunningHub/webhooks sem mascaramento
4. Visualizar status e etapas na UI para o usuário

---

## Arquitetura Proposta

```text
┌────────────────────────────────────────────────────────────────┐
│                      TABELAS DE JOBS                            │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ + current_step (text)      → etapa atual do job            ││
│  │ + step_history (jsonb[])   → array de etapas executadas    ││
│  │ + raw_api_response (jsonb) → resposta bruta da RunningHub  ││
│  │ + raw_webhook_payload(jsonb)→ payload bruto do webhook     ││
│  │ + failed_at_step (text)    → etapa onde falhou             ││
│  └────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│                      EDGE FUNCTIONS                             │
│  • Registrar cada etapa em step_history                        │
│  • Atualizar current_step a cada transição                     │
│  • Em caso de erro: marcar failed_at_step + salvar raw_*       │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│                      FRONTEND UI                                │
│  • Exibir current_step e position ao usuário                   │
│  • Se erro: mostrar failed_at_step + mensagem clara            │
│  • Modal de detalhes (admin): step_history + payloads raw      │
└────────────────────────────────────────────────────────────────┘
```

---

## Etapas do Job (Definição)

| Step Code | Nome Visível | Descrição |
|-----------|--------------|-----------|
| `upload` | Upload de Imagem | Imagem sendo enviada para storage |
| `insert` | Criando Job | Registro criado no banco |
| `credits` | Verificando Créditos | Consumo de créditos |
| `queue_check` | Verificando Fila | Consultando slots disponíveis |
| `queued` | Aguardando na Fila | Job está na fila FIFO |
| `starting` | Iniciando Processamento | Chamando API RunningHub |
| `running` | Processando | RunningHub executando workflow |
| `webhook_received` | Callback Recebido | Webhook da RunningHub chegou |
| `completed` | Concluído | Resultado disponível |
| `failed` | Falhou | Erro em alguma etapa |
| `cancelled` | Cancelado | Cancelado pelo usuário |

---

## Mudanças no Banco de Dados

### Migration: Adicionar colunas de observabilidade

Adicionar às 4 tabelas de jobs (`upscaler_jobs`, `pose_changer_jobs`, `veste_ai_jobs`, `video_upscaler_jobs`):

```sql
-- Etapa atual do job (para UI)
ALTER TABLE upscaler_jobs ADD COLUMN IF NOT EXISTS current_step text DEFAULT 'upload';
ALTER TABLE pose_changer_jobs ADD COLUMN IF NOT EXISTS current_step text DEFAULT 'upload';
ALTER TABLE veste_ai_jobs ADD COLUMN IF NOT EXISTS current_step text DEFAULT 'upload';
ALTER TABLE video_upscaler_jobs ADD COLUMN IF NOT EXISTS current_step text DEFAULT 'upload';

-- Histórico de etapas (para debug)
ALTER TABLE upscaler_jobs ADD COLUMN IF NOT EXISTS step_history jsonb DEFAULT '[]'::jsonb;
ALTER TABLE pose_changer_jobs ADD COLUMN IF NOT EXISTS step_history jsonb DEFAULT '[]'::jsonb;
ALTER TABLE veste_ai_jobs ADD COLUMN IF NOT EXISTS step_history jsonb DEFAULT '[]'::jsonb;
ALTER TABLE video_upscaler_jobs ADD COLUMN IF NOT EXISTS step_history jsonb DEFAULT '[]'::jsonb;

-- Resposta bruta da API RunningHub
ALTER TABLE upscaler_jobs ADD COLUMN IF NOT EXISTS raw_api_response jsonb;
ALTER TABLE pose_changer_jobs ADD COLUMN IF NOT EXISTS raw_api_response jsonb;
ALTER TABLE veste_ai_jobs ADD COLUMN IF NOT EXISTS raw_api_response jsonb;
ALTER TABLE video_upscaler_jobs ADD COLUMN IF NOT EXISTS raw_api_response jsonb;

-- Payload bruto do webhook
ALTER TABLE upscaler_jobs ADD COLUMN IF NOT EXISTS raw_webhook_payload jsonb;
ALTER TABLE pose_changer_jobs ADD COLUMN IF NOT EXISTS raw_webhook_payload jsonb;
ALTER TABLE veste_ai_jobs ADD COLUMN IF NOT EXISTS raw_webhook_payload jsonb;
ALTER TABLE video_upscaler_jobs ADD COLUMN IF NOT EXISTS raw_webhook_payload jsonb;

-- Etapa onde falhou (para UI)
ALTER TABLE upscaler_jobs ADD COLUMN IF NOT EXISTS failed_at_step text;
ALTER TABLE pose_changer_jobs ADD COLUMN IF NOT EXISTS failed_at_step text;
ALTER TABLE veste_ai_jobs ADD COLUMN IF NOT EXISTS failed_at_step text;
ALTER TABLE video_upscaler_jobs ADD COLUMN IF NOT EXISTS failed_at_step text;
```

---

## Mudanças nas Edge Functions

### 1. Função Helper: `logStep()`

Adicionar ao QueueManager e edge functions uma função para registrar etapas:

```typescript
async function logStep(
  table: string,
  jobId: string,
  step: string,
  details?: Record<string, any>
): Promise<void> {
  const timestamp = new Date().toISOString();
  const entry = { step, timestamp, ...details };
  
  await supabase
    .from(table)
    .update({
      current_step: step,
      step_history: supabase.sql`step_history || ${JSON.stringify([entry])}::jsonb`
    })
    .eq('id', jobId);
  
  console.log(`[${table}] Job ${jobId}: ${step}`, details || '');
}
```

### 2. Edge Functions de Ferramentas

Instrumentar cada ponto crítico:

```typescript
// runninghub-upscaler/run (exemplo)

// Após upload para RunningHub
await logStep('upscaler_jobs', jobId, 'upload', { fileName: rhFileName });

// Após consumir créditos
await logStep('upscaler_jobs', jobId, 'credits', { cost: creditCost, newBalance });

// Ao verificar fila
await logStep('upscaler_jobs', jobId, 'queue_check', { slotsAvailable, globalRunning });

// Se enfileirar
await logStep('upscaler_jobs', jobId, 'queued', { position });

// Ao chamar RunningHub
await logStep('upscaler_jobs', jobId, 'starting', { webappId, accountName });

// Em caso de erro
await supabase.from('upscaler_jobs').update({
  status: 'failed',
  current_step: 'failed',
  failed_at_step: 'credits', // ou qual step falhou
  error_message: errorMessage,
  raw_api_response: apiResponse // resposta bruta
}).eq('id', jobId);
await logStep('upscaler_jobs', jobId, 'failed', { error: errorMessage, at_step: 'credits' });
```

### 3. QueueManager `/finish`

Salvar payload do webhook:

```typescript
// handleFinish()
await supabase.from(table).update({
  status: newStatus,
  raw_webhook_payload: webhookPayload,
  current_step: newStatus,
  failed_at_step: isError ? 'webhook_received' : null,
}).eq('id', jobId);
await logStep(table, jobId, isError ? 'failed' : 'completed', { outputUrl, errorMessage });
```

### 4. Webhooks

Salvar payload bruto antes de processar:

```typescript
// runninghub-webhook
await supabase.from(jobTable).update({
  raw_webhook_payload: payload
}).eq('id', jobId);
await logStep(jobTable, jobId, 'webhook_received', { event, taskStatus });
```

---

## Mudanças no Frontend

### 1. Atualizar Realtime Subscription

As páginas já usam Realtime. Adicionar campos ao `SELECT`:

```typescript
// Dentro do onUpdate do Realtime
const newData = payload.new as {
  status: string;
  current_step: string;
  position: number;
  failed_at_step: string | null;
  error_message: string | null;
  output_url: string | null;
};
```

### 2. Exibir Etapa Atual na UI

Adicionar indicador visual de etapa:

```typescript
// Novo componente: JobStepIndicator.tsx
const STEP_LABELS: Record<string, string> = {
  upload: 'Enviando imagem...',
  insert: 'Preparando...',
  credits: 'Verificando créditos...',
  queue_check: 'Verificando fila...',
  queued: 'Aguardando na fila',
  starting: 'Iniciando processamento...',
  running: 'Processando com IA...',
  webhook_received: 'Finalizando...',
  completed: 'Concluído!',
  failed: 'Erro no processamento',
  cancelled: 'Cancelado',
};

const JobStepIndicator = ({ step, failedAtStep, errorMessage }: Props) => (
  <div className="flex items-center gap-2">
    <span className="text-sm text-purple-200">
      {STEP_LABELS[step] || step}
    </span>
    {failedAtStep && (
      <span className="text-xs text-red-400">
        Falhou em: {STEP_LABELS[failedAtStep]}
      </span>
    )}
  </div>
);
```

### 3. Modal de Detalhes (Admin/Debug)

Novo componente para visualizar histórico completo:

```typescript
// JobDebugModal.tsx
interface JobDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  tableName: string;
}

// Busca job com todos os campos de debug
const { data: job } = await supabase
  .from(tableName)
  .select(`
    id, status, current_step, failed_at_step,
    error_message, step_history,
    raw_api_response, raw_webhook_payload,
    created_at, started_at, completed_at
  `)
  .eq('id', jobId)
  .single();

// Exibe timeline de step_history
// Exibe raw payloads em JSON formatado
// Exibe error_message completo
```

### 4. Mensagem de Erro Clara

Atualizar toast/UI de erro:

```typescript
// Quando job falha
if (status === 'failed') {
  const stepLabel = STEP_LABELS[failedAtStep] || failedAtStep;
  toast.error(`Erro em "${stepLabel}": ${errorMessage}`, {
    duration: 10000,
    description: 'Toque para ver detalhes'
  });
}
```

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `supabase/migrations/XXXX_add_job_observability.sql` | Nova migration com colunas |
| `supabase/functions/runninghub-queue-manager/index.ts` | Função `logStep()` + instrumentação |
| `supabase/functions/runninghub-upscaler/index.ts` | Instrumentação de etapas |
| `supabase/functions/runninghub-pose-changer/index.ts` | Instrumentação de etapas |
| `supabase/functions/runninghub-veste-ai/index.ts` | Instrumentação de etapas |
| `supabase/functions/runninghub-video-upscaler/index.ts` | Instrumentação de etapas |
| `supabase/functions/runninghub-webhook/index.ts` | Salvar raw payload |
| `supabase/functions/runninghub-video-upscaler-webhook/index.ts` | Salvar raw payload |
| `src/components/ai-tools/JobStepIndicator.tsx` | **NOVO** - Indicador de etapa |
| `src/components/ai-tools/JobDebugModal.tsx` | **NOVO** - Modal de debug |
| `src/pages/UpscalerArcanoTool.tsx` | Exibir etapa + modal debug |
| `src/pages/PoseChangerTool.tsx` | Exibir etapa + modal debug |
| `src/pages/VesteAITool.tsx` | Exibir etapa + modal debug |
| `src/pages/VideoUpscalerTool.tsx` | Exibir etapa + modal debug |

---

## Onde Ficam os Logs

| Tipo de Log | Localização | Como Acessar |
|-------------|-------------|--------------|
| **Etapa atual** | Coluna `current_step` | Realtime na UI |
| **Histórico completo** | Coluna `step_history` (JSONB) | Modal de debug / SQL |
| **Resposta RunningHub** | Coluna `raw_api_response` | Modal de debug / SQL |
| **Payload Webhook** | Coluna `raw_webhook_payload` | Modal de debug / SQL |
| **Etapa da falha** | Coluna `failed_at_step` | UI + Modal de debug |
| **Erro completo** | Coluna `error_message` | UI + Modal de debug |
| **Logs console** | Edge Function logs | Backend → Edge Logs |

---

## Como a UI Mostra Etapa/Erro

### Durante processamento:
```
┌─────────────────────────────────────┐
│  🔄 Processando com IA...           │
│  ━━━━━━━━━━░░░░░░░░░░ 45%          │
└─────────────────────────────────────┘
```

### Na fila:
```
┌─────────────────────────────────────┐
│  ⏳ Aguardando na fila              │
│  Posição: #2                        │
│  ───────────────────────────────    │
│  💡 Fila com alta demanda, já já!   │
└─────────────────────────────────────┘
```

### Quando erro:
```
┌─────────────────────────────────────┐
│  ❌ Erro no processamento           │
│  Falhou em: Processando com IA      │
│  ───────────────────────────────    │
│  VRAM overflow: image too large     │
│  [Ver Detalhes] [Tentar Novamente]  │
└─────────────────────────────────────┘
```

---

## Como Debugar

### 1. Via UI (Modal de Debug)

Clicar em "Ver Detalhes" no erro abre modal com:
- Timeline de etapas executadas
- Timestamps de cada transição
- Resposta bruta da API
- Payload do webhook
- Mensagem de erro completa

### 2. Via SQL (Admin)

```sql
SELECT 
  id,
  status,
  current_step,
  failed_at_step,
  error_message,
  step_history,
  raw_api_response,
  raw_webhook_payload,
  created_at,
  started_at,
  completed_at
FROM upscaler_jobs
WHERE id = 'uuid-do-job'
ORDER BY created_at DESC
LIMIT 1;
```

### 3. Via Edge Function Logs

Acessar Backend → Edge Logs → Filtrar por função:
- `runninghub-queue-manager`
- `runninghub-upscaler`
- `runninghub-webhook`

Cada log inclui `[tabela] Job {id}: {step}` para facilitar busca.

---

## Resumo Entregável

| Item | Descrição |
|------|-----------|
| **Onde os logs ficam** | Colunas `step_history`, `raw_api_response`, `raw_webhook_payload` nas tabelas de jobs |
| **Como a UI mostra etapa** | Componente `JobStepIndicator` exibe `current_step` traduzido |
| **Como a UI mostra erro** | `failed_at_step` + `error_message` visíveis no card de status |
| **Como debugar** | Modal `JobDebugModal` com timeline + payloads raw, ou query SQL direta |
| **Logs de backend** | Console logs estruturados nas edge functions |

---

## Benefícios

1. **Zero adivinhação**: Sabe exatamente onde e por que falhou
2. **Erro real visível**: Mensagem da RunningHub sem mascaramento
3. **Histórico completo**: Timeline de cada etapa para reconstruir problema
4. **UI informativa**: Usuário sabe em que etapa está o job
5. **Debug rápido**: Modal de detalhes para análise imediata

