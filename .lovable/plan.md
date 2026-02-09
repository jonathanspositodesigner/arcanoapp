
## Gerador de Personagem - Plano de Implementacao

### Resumo

Nova ferramenta de IA onde o usuario envia **4 fotos** (frente, perfil, semi-perfil, low angle) para gerar um personagem. O resultado pode ser **salvo com um nome** no banco de dados, com galeria para ver e deletar personagens salvos. Custo: **100 creditos**. Tudo seguindo EXATAMENTE a mesma arquitetura robusta das outras ferramentas. **NAO sera adicionada na pagina /ferramentas-ia-aplicativo**.

---

### 1. Banco de Dados (Migration SQL)

**Tabela `character_generator_jobs`** - Identica a `arcano_cloner_jobs` com campos adicionais para as 4 fotos:
- Campos de imagem: `front_image_url`, `profile_image_url`, `semi_profile_image_url`, `low_angle_image_url`
- Campos de upload RunningHub: `front_file_name`, `profile_file_name`, `semi_profile_file_name`, `low_angle_file_name`
- Todos os campos padrao: session_id, user_id, task_id, status, output_url, error_message, position, credits_charged, credits_refunded, api_account, current_step, step_history, etc.
- RLS: usuario ve/insere seus proprios, service_role acesso total
- Realtime habilitado
- Indexes nos campos chave

**Tabela `saved_characters`** - Para salvar personagens:
- id UUID PK
- user_id UUID NOT NULL
- name TEXT NOT NULL
- image_url TEXT NOT NULL
- job_id UUID (referencia ao job)
- created_at TIMESTAMPTZ
- RLS: usuario CRUD apenas nos proprios

**RPCs atualizados:**
- `cleanup_all_stale_ai_jobs` - adicionar bloco para character_generator_jobs
- `get_user_ai_creations` - adicionar UNION ALL para character_generator_jobs
- `user_cancel_ai_job` - ja funciona dinamicamente com p_table_name, nao precisa alterar

---

### 2. Edge Function: `runninghub-character-generator`

Copia da estrutura do `runninghub-arcano-cloner` adaptada para:
- Upload de **4 imagens** para RunningHub (frente, perfil, semi-perfil, low angle)
- WebApp ID placeholder (voce fornece depois)
- Node IDs placeholder para as 4 imagens (voce fornece depois)
- Endpoints: `/upload`, `/run`, `/queue-status`, `/reconcile`
- Mesma logica completa: rate limit, retry, consumo de creditos atomico, estorno em falha, fila global via queue-manager

---

### 3. Atualizacoes em arquivos existentes

**`supabase/functions/runninghub-queue-manager/index.ts`:**
- Adicionar `character_generator_jobs` no array `JOB_TABLES`
- Adicionar no `WEBAPP_IDS` (placeholder)
- Adicionar no `TOOL_CONFIG` (nome, url, emoji)
- Adicionar no `toolNames` do check-user-active
- Adicionar case no `startJobOnRunningHub` switch

**`supabase/functions/runninghub-webhook/index.ts`:**
- Adicionar `character_generator_jobs` no array `IMAGE_JOB_TABLES`

**`src/ai/JobManager.ts`:**
- Adicionar `character_generator` no `ToolType`
- Adicionar mapeamentos em `TABLE_MAP`, `EDGE_FUNCTION_MAP`, `TOOL_NAMES`

**`src/App.tsx`:**
- Adicionar rota `/gerador-personagem` com lazy loading

---

### 4. Pagina `GeradorPersonagemTool.tsx`

Interface seguindo exatamente o padrao do ArcanoClonerTool com:

**Area de upload (4 fotos) em grid 2x2:**
- Card "DE FRENTE" - icone de rosto visto de frente
- Card "PERFIL" - icone de rosto de lado
- Card "SEMI PERFIL" - icone de rosto em 3/4
- Card "LOW ANGLE" - icone de rosto visto de baixo pra cima
- Mesma logica de upload/compressao (optimizeForAI)

**Botao "Gerar Personagem" (100 creditos):**
- Mesmos hooks: useJobStatusSync, useJobPendingWatchdog, useNotificationTokenRecovery, useQueueSessionCleanup, useProcessingButton
- Mesmos modais: NoCreditsModal, ActiveJobBlockModal
- Mesma barra de progresso e mensagens de fila

**Area de resultado:**
- Exibe imagem gerada com zoom/pan (TransformWrapper)
- Botao "Salvar Personagem" - abre dialog para digitar nome e salva na tabela saved_characters
- Botao "Gerar Novo" - reseta tudo
- Botao de download resiliente (useResilientDownload)
- Botao reconciliar apos 60s

**Galeria de personagens salvos:**
- Componente colapsavel/expansivel na lateral ou abaixo
- Grid dos personagens salvos (imagem + nome)
- Botao de deletar com confirmacao (AlertDialog)
- Busca direto do banco via supabase client

---

### 5. Componentes novos

- `src/components/character-generator/AngleUploadCard.tsx` - Card de upload com icone SVG representando o angulo do rosto
- `src/components/character-generator/SavedCharactersPanel.tsx` - Galeria de personagens salvos com CRUD
- `src/components/character-generator/SaveCharacterDialog.tsx` - Dialog para nomear e salvar personagem

---

### 6. O que NAO muda

- NAO adiciona na pagina `/ferramentas-ia-aplicativo` (conforme solicitado)
- NAO altera nenhuma funcionalidade existente das outras ferramentas
- NAO modifica client.ts ou types.ts
- WebApp ID e Node IDs ficam como placeholder ate voce enviar

---

### Detalhes tecnicos

**Custo:** 100 creditos por geracao, debitados no backend (edge function) apos upload das 4 imagens.

**Arquivos novos (6):**
1. `src/pages/GeradorPersonagemTool.tsx`
2. `src/components/character-generator/AngleUploadCard.tsx`
3. `src/components/character-generator/SavedCharactersPanel.tsx`
4. `src/components/character-generator/SaveCharacterDialog.tsx`
5. `supabase/functions/runninghub-character-generator/index.ts`
6. Migration SQL (tabelas + RPCs)

**Arquivos modificados (4):**
1. `src/ai/JobManager.ts`
2. `supabase/functions/runninghub-queue-manager/index.ts`
3. `supabase/functions/runninghub-webhook/index.ts`
4. `src/App.tsx`
