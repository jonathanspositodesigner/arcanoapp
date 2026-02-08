

## Resumo
Implementar o motor completo do **Arcano Cloner** usando a API RunningHub (WebApp ID `2019877042115842050`), seguindo exatamente o mesmo padrão das outras ferramentas de IA, incluindo:

- ✅ Modal de compressão quando imagem é muito grande (já existe no `ImageUploadCard`)
- ✅ Download resiliente que funciona no Safari/iOS (já existe com `useResilientDownload`)
- ✅ Overlay de progresso de download (já existe com `DownloadProgressOverlay`)
- ✅ Sincronização tripla (Realtime + Polling + Visibility)
- ✅ Watchdog para jobs travados
- ✅ Recuperação via token de notificação

---

## Componentes já prontos (não precisam de alteração)

| Componente | Funcionalidade |
|------------|----------------|
| `ImageUploadCard` | Detecta imagem grande e mostra modal de compressão |
| `ImageCompressionModal` | Botão "Comprimir e Usar" para imagens > 2000px |
| `PhotoLibraryModal` | Comprime automaticamente uploads para max 2048px |
| `ReferenceImageCard` | Apenas exibe e gerencia referência |
| `useResilientDownload` | 5 métodos de fallback para download (Safari/iOS) |
| `DownloadProgressOverlay` | Progresso circular durante download |

---

## O que será implementado

### 1. Tabela `arcano_cloner_jobs` no Banco de Dados

```sql
CREATE TABLE public.arcano_cloner_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID,
  task_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  user_file_name TEXT,
  reference_file_name TEXT,
  user_image_url TEXT,
  reference_image_url TEXT,
  aspect_ratio TEXT DEFAULT '1:1',
  output_url TEXT,
  error_message TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rh_cost INTEGER,
  user_credit_cost INTEGER,
  waited_in_queue BOOLEAN DEFAULT false,
  queue_wait_seconds INTEGER,
  api_account TEXT NOT NULL DEFAULT 'primary',
  credits_charged BOOLEAN DEFAULT false,
  credits_refunded BOOLEAN DEFAULT false,
  job_payload JSONB,
  current_step TEXT,
  step_history JSONB,
  raw_api_response JSONB,
  raw_webhook_payload JSONB,
  failed_at_step TEXT,
  thumbnail_url TEXT
);

-- Índices
CREATE INDEX idx_arcano_cloner_jobs_status ON arcano_cloner_jobs(status);
CREATE INDEX idx_arcano_cloner_jobs_session ON arcano_cloner_jobs(session_id);
CREATE INDEX idx_arcano_cloner_jobs_user ON arcano_cloner_jobs(user_id);
CREATE INDEX idx_arcano_cloner_jobs_task_id ON arcano_cloner_jobs(task_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE arcano_cloner_jobs;

-- RLS
ALTER TABLE arcano_cloner_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs" ON arcano_cloner_jobs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can insert" ON arcano_cloner_jobs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Service role full access" ON arcano_cloner_jobs
  FOR ALL USING (true);
```

### 2. Edge Function `runninghub-arcano-cloner`

Endpoints:
- `/upload` - Upload de imagens para RunningHub
- `/run` - Inicia processamento com o workflow
- `/queue-status` - Consulta status do job

**Mapeamento de Nodes do Workflow:**

| Node ID | Campo | Valor |
|---------|-------|-------|
| 58 | image | Foto do usuário (filename do RunningHub) |
| 62 | image | Foto de referência (filename do RunningHub) |
| 69 | text | Prompt fixo |
| 85 | aspectRatio | Proporção selecionada (1:1, 3:4, 9:16, 16:9) |

**Prompt fixo (Node 69):**
```
faça o homem da imagem 1 com a mesma pose, composição de cenário fundo e roupas da imagem 2. SEM RUÍDO NA FOTO
```

### 3. Atualizações em funções existentes

| Arquivo | Alteração |
|---------|-----------|
| `runninghub-webhook/index.ts` | Adicionar `arcano_cloner_jobs` à lista de tabelas |
| `runninghub-queue-manager/index.ts` | Adicionar WebApp ID e tabela |
| `src/ai/JobManager.ts` | Adicionar mapeamentos para `arcano_cloner` |

### 4. Atualização do ArcanoClonerTool.tsx

Habilitar os hooks que estão comentados e implementar o fluxo real de processamento:

```typescript
// Hooks que serão habilitados:
useJobStatusSync({
  jobId,
  toolType: 'arcano_cloner',
  enabled: status === 'processing' || status === 'waiting' || status === 'uploading',
  onStatusChange: (update) => { /* handler igual Pose Changer */ },
  onGlobalStatusChange: updateJobStatus,
});

useNotificationTokenRecovery({
  userId: user?.id,
  toolTable: 'arcano_cloner_jobs',
  onRecovery: useCallback((result) => { /* handler */ }, []),
});

useJobPendingWatchdog({
  jobId,
  toolType: 'arcano_cloner',
  enabled: status !== 'idle' && status !== 'completed' && status !== 'error',
  onJobFailed: useCallback((errorMessage) => { /* handler */ }, [endSubmit]),
});
```

**handleProcess atualizado:**
```typescript
// Step 1-2: Comprime e faz upload (já implementado)

// Step 3: Criar job no banco
const { data: job, error: jobError } = await supabase
  .from('arcano_cloner_jobs')
  .insert({
    session_id: sessionIdRef.current,
    user_id: user.id,
    status: 'pending',
    user_file_name: userUrl.split('/').pop(),
    reference_file_name: referenceUrl.split('/').pop(),
    aspect_ratio: aspectRatio,
  })
  .select()
  .single();

// Step 4: Chamar edge function
const { data: runResult, error: runError } = await supabase.functions.invoke(
  'runninghub-arcano-cloner/run',
  {
    body: {
      jobId: job.id,
      userImageUrl: userUrl,
      referenceImageUrl: referenceUrl,
      aspectRatio: aspectRatio,
      userId: user.id,
      creditCost: CREDIT_COST,
    },
  }
);
```

---

## Arquivos a Serem Criados/Modificados

| Arquivo | Ação |
|---------|------|
| Migration SQL | **Criar** tabela + policies + realtime |
| `supabase/functions/runninghub-arcano-cloner/index.ts` | **Criar** Edge Function completa |
| `supabase/functions/runninghub-webhook/index.ts` | Modificar - adicionar tabela |
| `supabase/functions/runninghub-queue-manager/index.ts` | Modificar - adicionar webapp ID e tabela |
| `src/ai/JobManager.ts` | Modificar - adicionar mapeamentos |
| `src/pages/ArcanoClonerTool.tsx` | Modificar - habilitar hooks e fluxo real |
| RPCs (`user_cancel_ai_job`, `cleanup_all_stale_ai_jobs`) | Modificar - incluir nova tabela |

---

## Fluxo Completo de Funcionamento

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  UPLOAD DE IMAGEM (Sua Foto)                                            │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Usuário seleciona imagem via ImageUploadCard                        │
│  2. SE imagem > 2000px → abre ImageCompressionModal                     │
│     → Usuário clica "Comprimir e Usar"                                  │
│     → Imagem comprimida para max 1999px                                 │
│  3. Imagem exibida no card com dimensões (📐 1920 x 1080 px)           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  REFERÊNCIA (Foto de Referência)                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Usuário clica no ReferenceImageCard (+)                             │
│  2. Abre PhotoLibraryModal                                              │
│     → Pode escolher da biblioteca (já otimizada)                        │
│     → Ou fazer upload (comprimido automaticamente para 2048px)          │
│  3. Imagem exibida no card                                              │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  PROCESSAMENTO                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Click "Gerar Imagem (80 créditos)"                                  │
│  2. Validações (login, créditos, job ativo)                             │
│  3. Comprime ambas imagens com optimizeForAI (1536px, WebP)             │
│  4. Upload para Supabase Storage                                        │
│  5. Cria job em arcano_cloner_jobs                                      │
│  6. Chama edge function /run                                            │
│  7. Edge function:                                                       │
│     a. Baixa imagens do Storage                                         │
│     b. Upload para RunningHub                                           │
│     c. Consome créditos                                                 │
│     d. Verifica fila global (max 3 simultâneos)                         │
│     e. Inicia workflow com webhook                                      │
│  8. Sincronização tripla monitora status                                │
│  9. Webhook recebe resultado                                            │
│  10. Frontend atualiza via Realtime                                     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  DOWNLOAD DO RESULTADO                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Usuário clica no botão Download                                     │
│  2. useResilientDownload tenta 5 métodos:                               │
│     → Edge function proxy (ignora CORS no Safari)                       │
│     → Fetch + Stream (progresso real)                                   │
│     → Fetch + Cache Buster                                              │
│     → Anchor tag                                                        │
│     → Share API (mobile)                                                │
│  3. DownloadProgressOverlay mostra progresso                            │
│  4. Toast "Download concluído!"                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Observação sobre Secrets

O projeto já possui `RUNNINGHUB_API_KEY` configurado, então não é necessário adicionar novas secrets.

