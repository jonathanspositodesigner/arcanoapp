
# Veste AI - Ferramenta de Troca de Roupa com IA

## Resumo

Criar uma nova ferramenta de IA chamada **Veste AI** especializada em troca de roupa. O usuário envia duas imagens:
1. **Foto da pessoa** - a foto base do usuário
2. **Foto do look/roupa** - a roupa de referência que deseja aplicar

A arquitetura será idêntica ao Pose Changer, compartilhando a **fila global** com máximo de 3 jobs simultâneos (entre Upscaler, Pose Changer e Veste AI).

---

## Estrutura de Arquivos

```text
src/
├── pages/
│   └── VesteAITool.tsx                    # Página principal da ferramenta
├── components/
│   └── veste-ai/
│       ├── ImageUploadCard.tsx             # Reutiliza do pose-changer
│       └── ClothingLibraryModal.tsx        # Biblioteca de roupas (novo)

supabase/
├── functions/
│   └── runninghub-veste-ai/
│       └── index.ts                        # Edge Function do motor IA
└── migrations/
    └── XXXX_create_veste_ai_jobs.sql       # Tabela de jobs
```

---

## Banco de Dados

### Nova Tabela: `veste_ai_jobs`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| session_id | text | Identificador da sessão do browser |
| user_id | uuid | FK opcional para profiles |
| task_id | text | ID retornado pelo RunningHub |
| status | text | queued, running, completed, failed, cancelled |
| person_file_name | text | Nome do arquivo da pessoa no RunningHub |
| clothing_file_name | text | Nome do arquivo da roupa no RunningHub |
| output_url | text | URL da imagem gerada |
| error_message | text | Mensagem de erro se falhou |
| position | integer | Posição na fila |
| created_at | timestamptz | Criação |
| started_at | timestamptz | Início do processamento |
| completed_at | timestamptz | Conclusão |

### RPC Functions

```sql
-- Atualizar posições da fila
CREATE FUNCTION update_veste_ai_queue_positions()
RETURNS void

-- RLS Policy
ALTER PUBLICATION supabase_realtime ADD TABLE veste_ai_jobs;
```

---

## Edge Function: `runninghub-veste-ai`

### Endpoints

| Endpoint | Função |
|----------|--------|
| `/run` | Envia job para processamento |
| `/queue-status` | Verifica status do job |

### Configuração Separada

```typescript
// WebApp ID para Veste AI (placeholder - será preenchido com a doc da API)
const WEBAPP_ID_VESTE_AI = 'XXXXXXXXXXXXXXX';

// Node IDs (placeholder - será preenchido com a doc da API)
// nodeId "??" = Person photo
// nodeId "??" = Clothing reference
```

A configuração será **completamente separada** das outras ferramentas, permitindo alterar nodeIds e WebApp ID sem afetar Upscaler ou Pose Changer.

### Fila Global Compartilhada

```typescript
// Conta jobs running de TODAS as ferramentas IA
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

const runningCount = (upscalerRunning || 0) + (poseRunning || 0) + (vesteRunning || 0);

if (runningCount >= MAX_CONCURRENT_JOBS) {
  // Enfileirar job
}
```

---

## Webhook Unificado

Atualizar `runninghub-webhook/index.ts` para processar jobs da nova tabela:

```typescript
// Adicionar busca na tabela veste_ai_jobs
if (!jobData) {
  const { data: vesteJob } = await supabase
    .from('veste_ai_jobs')
    .select('id')
    .eq('task_id', taskId)
    .maybeSingle();

  if (vesteJob) {
    jobTable = 'veste_ai_jobs';
    jobData = vesteJob;
  }
}

// Adicionar processamento da fila
await processNextInQueue('veste_ai_jobs');

// Nova função para iniciar jobs Veste AI
async function startVesteAIJob(job: any) {
  // Placeholder - nodeInfoList será definido com a doc da API
}
```

---

## Frontend: VesteAITool.tsx

### Layout

```text
┌────────────────────────────────────────────────────────────────┐
│  [←] Veste AI                         👤 Perfil | 💰 1.500    │
├───────────────┬────────────────────────────────────────────────┤
│               │                                                 │
│  ┌─────────┐  │                                                 │
│  │ Sua Foto│  │                                                 │
│  │         │  │         ┌─────────────────────────┐             │
│  │  [📷]   │  │         │                         │             │
│  └─────────┘  │         │    RESULTADO            │             │
│               │         │                         │             │
│  ┌─────────┐  │         │     (zoom/pan)          │             │
│  │  Roupa  │  │         │                         │             │
│  │Referênci│  │         └─────────────────────────┘             │
│  │  [👕]   │  │                                                 │
│  │Biblioteca│ │                                                 │
│  └─────────┘  │                                                 │
│               │                                                 │
│ [✨ Trocar]   │                [Nova] [Baixar HD]               │
│    60 💰      │                                                 │
└───────────────┴────────────────────────────────────────────────┘
```

### Custo de Créditos

```typescript
const CREDIT_COST = 60; // Mesmo custo do Pose Changer (pode ser ajustado)
```

### Estados de Processamento

- `idle` - Aguardando input
- `uploading` - Enviando imagens
- `processing` - IA trabalhando
- `waiting` - Na fila (mostra posição)
- `completed` - Sucesso
- `error` - Falha

---

## Rotas

### App.tsx

```typescript
const VesteAITool = lazy(() => import("./pages/VesteAITool"));

// ...

<Route path="/veste-ai-tool" element={<VesteAITool />} />
```

### Navegação

Na página `/ferramentas-ia-aplicativo`, o card "Mudar Roupa" será atualizado para direcionar para a nova ferramenta (ou criar novo card "Veste AI").

---

## Componente: ClothingLibraryModal

Modal similar ao PoseLibraryModal mas com roupas de referência:

```typescript
type ClothingFilter = 'masculino' | 'feminino' | 'unissex';

const CLOTHING_CATEGORIES = [
  { id: 'casual', label: 'Casual' },
  { id: 'formal', label: 'Formal' },
  { id: 'esportivo', label: 'Esportivo' },
  { id: 'elegante', label: 'Elegante' },
];
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/VesteAITool.tsx` | Página principal |
| `src/components/veste-ai/ClothingLibraryModal.tsx` | Modal de biblioteca de roupas |
| `supabase/functions/runninghub-veste-ai/index.ts` | Edge Function |
| Migração SQL | Tabela + RPC + Realtime |

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/App.tsx` | Adicionar rota `/veste-ai-tool` |
| `supabase/config.toml` | Registrar nova function |
| `supabase/functions/runninghub-webhook/index.ts` | Adicionar suporte para `veste_ai_jobs` |
| `src/pages/FerramentasIAAplicativo.tsx` | Atualizar navegação (opcional) |

---

## Configuração Futura (Após Documentação da API)

Quando você enviar a documentação da API do RunningHub para a Veste AI, será necessário:

1. **Definir o WebApp ID** correto
2. **Mapear os nodeIds** para:
   - Imagem da pessoa
   - Imagem da roupa de referência
3. **Ajustar parâmetros** específicos se houver (ex: estilo, intensidade)

---

## Resumo das Alterações

1. **Banco de Dados**: Nova tabela `veste_ai_jobs` + RPC + Realtime
2. **Edge Function**: `runninghub-veste-ai` com configuração própria
3. **Webhook**: Atualizar para processar fila de `veste_ai_jobs`
4. **Frontend**: Página `VesteAITool.tsx` + modal de biblioteca
5. **Rotas**: Nova rota `/veste-ai-tool`

Tudo **isolado e independente** das outras ferramentas de IA!
