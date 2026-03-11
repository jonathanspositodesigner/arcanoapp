

## Plano: Nova Ferramenta de IA — Remover Fundo (Background Remover)

### Resumo simples

Vou criar uma nova ferramenta chamada **"Remover Fundo"** que funciona exatamente como as outras ferramentas de IA. O usuário faz upload de uma foto, a IA remove o fundo, e ele baixa o resultado em PNG transparente. Custa **5 créditos** por imagem.

**O que NÃO vai ser alterado:** Nenhuma ferramenta existente será modificada no seu código principal. As únicas edições em arquivos existentes são para **registrar** a nova ferramenta nos mapeamentos centrais (mesma abordagem usada para Flyer Maker, Arcano Cloner, etc).

---

### Etapas

#### 1. Criar tabela `bg_remover_jobs` (Migração SQL)

Tabela com a mesma estrutura padrão das outras ferramentas, mas simplificada (apenas 1 input de imagem):
- `input_url`, `input_file_name` — imagem de entrada
- Campos padrão: `status`, `task_id`, `output_url`, `thumbnail_url`, `error_message`, `position`, `credits_charged`, `credits_refunded`, `user_credit_cost`, `rh_cost`, `step_history`, etc.
- RLS: usuário vê/cria apenas seus próprios jobs
- Realtime habilitado
- Atualizar as RPCs `get_ai_tools_usage`, `get_ai_tools_usage_count`, `get_ai_tools_usage_summary` com UNION ALL para `bg_remover_jobs`
- Atualizar `cleanup_all_stale_ai_jobs` para incluir `bg_remover_jobs`
- Atualizar `user_cancel_ai_job` e `mark_pending_job_as_failed` para incluir `bg_remover_jobs`

#### 2. Criar Edge Function `runninghub-bg-remover`

Seguindo o padrão exato do `runninghub-pose-changer` mas simplificado (1 imagem só):
- Endpoint `/upload` — faz upload da imagem para RunningHub
- Endpoint `/run` — cria job, consome créditos, faz upload da imagem para RunningHub, verifica fila centralizada, inicia ou enfileira
- WebApp ID: `2031815099811368962`
- Nó: `nodeId: "1"`, `fieldName: "image"` (conforme a documentação fornecida)
- Validação de input, rate limiting, observabilidade completa

#### 3. Atualizar `runninghub-queue-manager`

Apenas adicionar a nova ferramenta nos mapeamentos existentes (sem alterar lógica):
- `WEBAPP_IDS`: adicionar `bg_remover_jobs: '2031815099811368962'`
- `JOB_TABLES`: adicionar `'bg_remover_jobs'`
- `TOOL_CONFIG`: adicionar entrada para notificações
- `toolNames` no `handleCheckUserActive`: adicionar `'bg_remover_jobs': 'Remover Fundo'`
- `startJobOnRunningHub` switch: adicionar case `bg_remover_jobs` com nodeInfoList simples (1 nó, imagem)

#### 4. Atualizar `runninghub-webhook`

Adicionar `bg_remover_jobs` na lista de tabelas que o webhook procura quando recebe callback da RunningHub.

#### 5. Atualizar `JobManager.ts` (Frontend central)

Adicionar nos mapeamentos:
- `ToolType`: adicionar `'bg_remover'`
- `TABLE_MAP`: `bg_remover: 'bg_remover_jobs'`
- `EDGE_FUNCTION_MAP`: `bg_remover: 'runninghub-bg-remover/run'`
- `TOOL_NAMES`: `'Remover Fundo': 'bg_remover'`

#### 6. Criar página `RemoverFundoTool.tsx`

Layout simplificado seguindo o padrão das outras ferramentas:
- Upload de 1 imagem (com compressão automática >2000px via `ImageCompressionModal` + `optimizeForAI`)
- Botão "Remover Fundo" (5 créditos)
- Área de resultado com a imagem PNG sem fundo
- Botão de download e "Remover fundo de outra imagem"
- Hooks padrão: `useJobStatusSync`, `useProcessingButton`, `useAIJob`, `useResilientDownload`, `useJobPendingWatchdog`, `useQueueSessionCleanup`
- Fila visual, debug panel, notification prompt — tudo igual

#### 7. Registrar na página de ferramentas e rotas

- `App.tsx`: adicionar rota `/remover-fundo`
- `FerramentasIAAplicativo.tsx`: adicionar card da ferramenta na lista
- `AdminAIToolsUsageTab.tsx`: adicionar nos filtros, `getTableName`, `getInputColumn`

#### 8. Inserir configuração de custo no `ai_tool_settings`

Inserir registro com custo padrão de 5 créditos para "Remover Fundo".

---

### Garantias de segurança

- **Nenhuma ferramenta existente será quebrada** — todas as mudanças em arquivos compartilhados são apenas adições aos mapeamentos (switch/case, arrays, objetos)
- A fila centralizada continua funcionando igual — apenas reconhece mais uma tabela
- O webhook continua funcionando igual — apenas procura em mais uma tabela
- Os RPCs de custos são atualizados via UNION ALL — sem alterar queries existentes

