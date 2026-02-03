

# Upscaler Arcano (Video) - Ferramenta de IA Isolada

## Resumo

Criar uma nova ferramenta de upscaling de vídeo **completamente independente** das outras ferramentas de IA, seguindo a arquitetura existente mas com:

- **Motor próprio** (WebApp ID a ser fornecido depois)
- **Edge Function própria** (`runninghub-video-upscaler`)
- **Webhook próprio** (`runninghub-video-upscaler-webhook`)  
- **Tabela própria** (`video_upscaler_jobs`)
- **Sem modificar nenhuma ferramenta existente**

### Especificações

| Item | Valor |
|------|-------|
| Custo | 150 créditos |
| Input | Um único vídeo |
| Resolução máxima | 1280px (maior dimensão) |
| Duração máxima | 8 segundos |
| Formatos aceitos | MP4, WebM, MOV |

---

## Arquivos a Criar

### 1. Frontend - Página Principal
**`src/pages/VideoUpscalerTool.tsx`**

Interface completa com:
- Upload de vídeo com validação (max 1280px, max 8s)
- Preview do vídeo com thumbnail
- Botão "Upscale" (150 créditos)
- Player de vídeo para resultado
- Botão de download
- Indicadores de fila e progresso

Layout: Grid responsivo com sidebar de controles (28%) + área de resultado (72%)

### 2. Frontend - Componente de Upload de Vídeo
**`src/components/video-upscaler/VideoUploadCard.tsx`**

Componente dedicado para upload de vídeo com:
- Validação de dimensões (maior dimensão ≤ 1280px)
- Validação de duração (≤ 8 segundos)
- Preview com thumbnail gerado
- Exibição de metadados (resolução, duração)
- Drag & drop support
- Formatos aceitos: MP4, WebM, MOV

### 3. Backend - Edge Function de Processamento
**`supabase/functions/runninghub-video-upscaler/index.ts`**

Edge function **isolada** com endpoints:
- `/upload` - Upload de vídeo para RunningHub
- `/run` - Inicia o processamento
- `/queue-status` - Consulta status na fila

Características:
- WebApp ID: **placeholder** (será configurado quando a documentação da API for fornecida)
- Rate limiting próprio
- Consumo de 150 créditos
- Participa da fila global (max 3 jobs simultâneos)
- **Não modifica** as outras Edge Functions

### 4. Backend - Webhook Próprio
**`supabase/functions/runninghub-video-upscaler-webhook/index.ts`**

Webhook **dedicado** para processar callbacks do RunningHub:
- Recebe notificações de conclusão/erro
- Atualiza tabela `video_upscaler_jobs`
- Inicia próximo job da fila
- **Completamente separado** do webhook das outras ferramentas

### 5. Database - Nova Tabela
**`video_upscaler_jobs`**

```sql
CREATE TABLE public.video_upscaler_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  task_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  
  -- Input metadata
  input_file_name TEXT,
  video_width INTEGER,
  video_height INTEGER,
  video_duration_seconds NUMERIC(6,2),
  
  -- Output
  output_url TEXT,
  error_message TEXT,
  position INTEGER,
  
  -- Costs
  user_credit_cost INTEGER DEFAULT 150,
  rh_cost INTEGER,
  waited_in_queue BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_video_upscaler_jobs_user_id ON video_upscaler_jobs(user_id);
CREATE INDEX idx_video_upscaler_jobs_session_id ON video_upscaler_jobs(session_id);
CREATE INDEX idx_video_upscaler_jobs_status ON video_upscaler_jobs(status);
CREATE INDEX idx_video_upscaler_jobs_task_id ON video_upscaler_jobs(task_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE video_upscaler_jobs;

-- RLS
ALTER TABLE video_upscaler_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own jobs"
  ON video_upscaler_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs"
  ON video_upscaler_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can do anything"
  ON video_upscaler_jobs FOR ALL
  USING (auth.role() = 'service_role');
```

---

## Arquivos a Modificar

### 1. `supabase/config.toml`
Adicionar configuração das duas novas funções:
```toml
[functions.runninghub-video-upscaler]
verify_jwt = false

[functions.runninghub-video-upscaler-webhook]
verify_jwt = false
```

### 2. `src/App.tsx`
- Adicionar import lazy para `VideoUpscalerTool`
- Adicionar rota `/video-upscaler-tool`

### 3. `src/pages/FerramentasIAAplicativo.tsx`
- Adicionar card para "Upscaler Arcano V3 (vídeo)"
- Configurar navegação para `/video-upscaler-tool`
- Adicionar override de nome e rota

---

## Validação de Vídeo (Client-side)

```typescript
interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  metadata?: VideoMetadata;
}

const validateVideo = (file: File): Promise<ValidationResult> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      const duration = video.duration;
      
      const maxDimension = Math.max(width, height);
      
      if (maxDimension > 1280) {
        resolve({ 
          valid: false, 
          error: `Resolução muito alta (${width}x${height}). Dimensão máxima: 1280px` 
        });
      } else if (duration > 8) {
        resolve({ 
          valid: false, 
          error: `Vídeo muito longo (${duration.toFixed(1)}s). Máximo: 8 segundos` 
        });
      } else {
        resolve({ 
          valid: true, 
          metadata: { width, height, duration } 
        });
      }
      
      URL.revokeObjectURL(video.src);
    };
    
    video.onerror = () => {
      resolve({ valid: false, error: 'Formato de vídeo não suportado' });
      URL.revokeObjectURL(video.src);
    };
    
    video.src = URL.createObjectURL(file);
  });
};
```

---

## Fluxo de Uso

1. **Upload**: Usuário seleciona/arrasta vídeo
2. **Validação**: 
   - Verifica dimensões (≤ 1280px na maior)
   - Verifica duração (≤ 8 segundos)
   - Exibe erro se inválido
3. **Preview**: Gera thumbnail e mostra metadados
4. **Processamento**:
   - Clica "Upscale" → Verifica créditos (150)
   - Cria job no DB (`video_upscaler_jobs`)
   - Upload vídeo para Supabase Storage
   - Edge function transfere para RunningHub
   - Debita créditos atomicamente no backend
   - Entra na fila global (max 3 concurrent)
5. **Resultado**: 
   - Webhook próprio recebe callback
   - Atualiza status via Realtime
   - Player exibe resultado
   - Botão de download disponível

---

## Isolamento Garantido

| Componente | Video Upscaler | Outras Ferramentas |
|------------|----------------|-------------------|
| Tabela DB | `video_upscaler_jobs` | `upscaler_jobs`, `pose_changer_jobs`, `veste_ai_jobs` |
| Edge Function | `runninghub-video-upscaler` | `runninghub-upscaler`, `runninghub-pose-changer`, `runninghub-veste-ai` |
| Webhook | `runninghub-video-upscaler-webhook` | `runninghub-webhook` |
| WebApp ID | A ser definido | IDs específicos de cada |
| Node Mapping | A ser definido | Específico de cada |

**Nenhuma modificação será feita em:**
- `runninghub-upscaler`
- `runninghub-pose-changer`
- `runninghub-veste-ai`
- `runninghub-webhook`

---

## Fila Global Compartilhada

A única integração com as outras ferramentas é a **contagem de jobs simultâneos** para respeitar o limite global de 3:

```typescript
// Dentro de runninghub-video-upscaler/index.ts
const { count: upscalerRunning } = await supabase
  .from('upscaler_jobs')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'running');

const { count: poseRunning } = await supabase
  .from('pose_changer_jobs')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'running');

const { count: vesteRunning } = await supabase
  .from('veste_ai_jobs')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'running');

const { count: videoUpscalerRunning } = await supabase
  .from('video_upscaler_jobs')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'running');

const totalRunning = (upscalerRunning || 0) + (poseRunning || 0) + 
                     (vesteRunning || 0) + (videoUpscalerRunning || 0);
```

---

## Próximos Passos Após Aprovação

1. Criar tabela `video_upscaler_jobs` com RLS
2. Criar componente `VideoUploadCard.tsx`
3. Criar página `VideoUpscalerTool.tsx`
4. Criar Edge Function `runninghub-video-upscaler` (com placeholder para WebApp ID)
5. Criar Webhook `runninghub-video-upscaler-webhook`
6. Atualizar `supabase/config.toml`
7. Atualizar `App.tsx` com nova rota
8. Atualizar `FerramentasIAAplicativo.tsx` com novo card

**Aguardando:** Documentação da API do RunningHub para configurar WebApp ID e Node mapping específicos do Video Upscaler.

