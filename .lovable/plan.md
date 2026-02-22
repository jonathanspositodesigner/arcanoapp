
## Flyer Maker - Nova Ferramenta de IA

### Resumo

Criar a ferramenta **Flyer Maker** que gera flyers personalizados usando a RunningHub API. A implementacao segue **exatamente** os mesmos padroes do Arcano Cloner, incluindo fila global, watchdogs, RLS, creditos, notificacoes, refinar via Google Gemini, e mecanismos de prevencao de erros.

### Dados confirmados da API RunningHub

- **WebApp ID**: `2025656642724962305`
- **Custo**: 80 creditos
- **Nodes**:
  - `11` - ARTISTA 1 (image)
  - `12` - ARTISTA 2 (image)
  - `13` - ARTISTA 3 (image)
  - `14` - ARTISTA 4 (image)
  - `15` - ARTISTA 5 (image)
  - `1` - FLYER REFERENCIA (image)
  - `28` - LOGO DO LOCAL (image)
  - `6` - DATA HORA E LOCAL (text)
  - `10` - NOMES DOS ARTISTAS (text)
  - `7` - TITULO (text)
  - `9` - PROMOCAO DE RODAPE (text)
  - `103` - ENDERECO (text)
  - `68` - TAMANHO/aspectRatio (Feed 3:4 ou Stories 9:16)
  - `111` - CRIATIVIDADE DA IA (value, 0-5)

---

### Arquivos a CRIAR

#### 1. Migracao SQL - Tabela `flyer_maker_jobs`

Mesma estrutura das outras tabelas de jobs, com colunas especificas:

```text
- id (uuid PK)
- session_id, user_id (uuid)
- status (text) - pending/queued/starting/running/completed/failed/cancelled
- reference_image_url, reference_file_name (flyer de referencia)
- artist_photo_urls (JSONB - array de URLs das fotos, ate 5)
- artist_photo_file_names (JSONB - array de file names na RunningHub)
- artist_count (integer - quantas fotos enviadas, 1-5)
- logo_url, logo_file_name (logo do local)
- date_time_location (text)
- title (text)
- address (text)
- artist_names (text)
- footer_promo (text)
- image_size (text - "3:4" ou "9:16")
- creativity (integer 0-5)
- task_id, output_url, output_thumbnail_url
- error_message, position, started_at, completed_at
- user_credit_cost, rh_cost, credits_charged, credits_refunded
- waited_in_queue, queue_wait_seconds, api_account
- current_step, failed_at_step, step_history (JSONB)
- raw_api_response (JSONB), raw_webhook_payload (JSONB)
- created_at, updated_at
```

RLS policies (identicas as outras ferramentas):
- SELECT: usuario ve seus proprios jobs (`user_id = auth.uid()`)
- INSERT: usuario cria seus proprios jobs (`user_id = auth.uid()`)
- Service role acesso total (via SECURITY DEFINER nos RPCs)

Realtime habilitado via `ALTER PUBLICATION supabase_realtime ADD TABLE flyer_maker_jobs`.

#### 2. `src/pages/FlyerMakerTool.tsx`

Pagina principal baseada no ArcanoClonerTool.tsx, com as seguintes diferencas:

**Painel esquerdo (inputs):**
- **Flyer de Referencia**: Reutiliza `ReferenceImageCard` + `PhotoLibraryModal` (selecionar da biblioteca ou upload)
- **Fotos dos Artistas (1-5)**: Grid de upload com ate 5 slots, botao para adicionar/remover, compressao via `optimizeForAI`, minimo 1 obrigatorio
- **Logo do Local**: Upload unico com compressao
- **Data, Hora e Local**: Input de texto com placeholder "SEG.18.ABR - 18H"
- **Titulo**: Input de texto com placeholder "DEU FERIAS"
- **Endereco**: Input de texto com placeholder de exemplo
- **Nomes dos Artistas**: Input de texto com placeholder "DJ ALOK - RASTA CHINELA - SWINGAO DA BAHIA"
- **Promocao de Rodape**: Input de texto com placeholder "ENTRADA OFF PARA ELAS ATE AS 20H"
- **Tamanho**: Seletor Feed (3:4) / Stories (9:16) com 2 botoes
- **Criatividade**: Slider 0 a 5 (padrao 0) - diferente do Arcano Cloner que usa 0-100
- **Botao "Gerar Flyer"**: Com custo de 80 creditos, lock anti-duplo-clique

**Painel direito (resultado):**
- Identico ao Arcano Cloner: TransformWrapper com zoom/pan
- Botoes: Nova, Refinar (Google Gemini, 30 creditos), Baixar HD
- Linha do tempo de refinamentos (RefinementTimeline)

**Logica de processamento (handleProcess):**
1. `startSubmit()` - lock anti-duplo-clique
2. Verificar autenticacao, job ativo, saldo
3. Comprimir e fazer upload de todas as imagens (referencia, 1-5 artistas, logo) para Supabase Storage (`artes-cloudinary/flyer-maker/{user_id}/`)
4. Criar job na tabela `flyer_maker_jobs` com status `pending`
5. Chamar `supabase.functions.invoke('runninghub-flyer-maker/run')` com todas as URLs
6. Aguardar atualizacao via Realtime (useJobStatusSync)

**Mecanismos identicos ao Arcano Cloner:**
- `useProcessingButton` (lock anti-duplo-clique)
- `useJobStatusSync` (triple sync: Realtime + Polling + Visibility)
- `useJobPendingWatchdog` (30s timeout para jobs orfaos)
- `useNotificationTokenRecovery`
- `useQueueSessionCleanup`
- `useResilientDownload`
- `useAIJob` (contexto global - som de notificacao)
- `mark_pending_job_as_failed` no catch block
- Modal de creditos insuficientes, job ativo, auth
- Botao "Atualizar status" apos 60s (reconcile)
- Botao "Sair da Fila"
- Debug panel
- Download progress overlay

**Formatacao dos textos enviados a API:**
Cada campo de texto sera prefixado antes de enviar:
- `DATA HORA E LOCAL: [valor]`
- `TITULO: [valor]`
- `ENDERECO: [valor]`
- `NOMES DOS ARTISTAS: [valor]`
- `PROMOCAO DE RODAPE: [valor]`

#### 3. `supabase/functions/runninghub-flyer-maker/index.ts`

Edge Function baseada na `runninghub-arcano-cloner`, com as seguintes diferencas:

- WebApp ID: `2025656642724962305`
- Upload de ate 7 imagens (1 referencia + ate 5 artistas + 1 logo) para RunningHub
- Construcao do `nodeInfoList` com os 14 nodes (11-15 artistas, 1 referencia, 28 logo, 6/10/7/9/103 textos, 68 aspectRatio, 111 criatividade)
- Para artistas nao enviados (se menos de 5), enviar uma imagem placeholder transparente ou a mesma imagem do artista 1
- Endpoints: `/upload`, `/run`, `/queue-status`, `/reconcile`
- Rate limiting identico
- `fetchWithRetry` com 4 tentativas
- Consumo de creditos atomico no backend
- Estorno imediato se start falhar (sem task_id)
- Logs de observabilidade (logStep, logStepFailure)

---

### Arquivos a MODIFICAR

#### 4. `src/ai/JobManager.ts`

Adicionar `flyer_maker` ao sistema:

```typescript
// TABLE_MAP
flyer_maker: 'flyer_maker_jobs',

// EDGE_FUNCTION_MAP
flyer_maker: 'runninghub-flyer-maker/run',

// TOOL_NAMES
'Flyer Maker': 'flyer_maker',
```

#### 5. `supabase/functions/runninghub-queue-manager/index.ts`

Adicionar suporte ao Flyer Maker:

- `WEBAPP_IDS`: `flyer_maker_jobs: '2025656642724962305'`
- `JOB_TABLES`: adicionar `'flyer_maker_jobs'`
- `TOOL_CONFIG`: `flyer_maker_jobs: { name: 'Flyer Maker', url: '/flyer-maker', emoji: '🎭' }`
- `startJobOnRunningHub`: novo case para `flyer_maker_jobs` construindo os 14 nodes

#### 6. `supabase/functions/runninghub-webhook/index.ts`

Adicionar `'flyer_maker_jobs'` ao array `IMAGE_JOB_TABLES`.

#### 7. RPCs do banco (migracao SQL)

Atualizar as seguintes funcoes para incluir `flyer_maker_jobs`:
- `cleanup_all_stale_ai_jobs` - novo bloco FOR para flyer_maker_jobs
- `user_cancel_ai_job` - novo ELSIF para flyer_maker_jobs
- `mark_pending_job_as_failed` - novo ELSIF para flyer_maker_jobs
- `get_ai_tools_usage` (ambas versoes) - novo UNION ALL
- `get_ai_tools_usage_count` - novo UNION ALL
- `get_ai_tools_usage_summary` - novo UNION ALL
- `get_ai_tools_cost_averages` - novo UNION ALL
- `get_user_creations` - novo UNION ALL
- `cleanup_completed_jobs` - novo DELETE
- `delete_single_creation` - novo ELSIF

#### 8. `src/App.tsx`

Adicionar rota: `<Route path="/flyer-maker" element={<FlyerMakerTool />} />`

#### 9. `src/pages/FerramentasIAAplicativo.tsx`

Adicionar card do Flyer Maker na lista de ferramentas.

#### 10. `src/components/admin/AdminAIToolsUsageTab.tsx`

Mapear `flyer_maker_jobs` para filtros, badges e nomes de tabela.

#### 11. `supabase/config.toml`

Nao sera editado (o sistema adiciona automaticamente). A Edge Function `runninghub-flyer-maker` sera deployada automaticamente.

---

### Detalhes tecnicos do nodeInfoList

Para artistas nao enviados (usuario mandou menos de 5), a Edge Function enviara a mesma imagem do artista 1 para os nodes restantes. Isso garante que todos os 5 nodes de imagem (11-15) sempre recebam um valor valido.

```text
Exemplo com 2 artistas:
Node 11 = artista1.jpg (enviado)
Node 12 = artista2.jpg (enviado)
Node 13 = artista1.jpg (repetido)
Node 14 = artista1.jpg (repetido)
Node 15 = artista1.jpg (repetido)
```

### Fluxo de dados

```text
1. Usuario preenche inputs no frontend
2. Frontend comprime imagens (optimizeForAI)
3. Frontend faz upload para Storage (artes-cloudinary/flyer-maker/{userId}/)
4. Frontend cria job em flyer_maker_jobs (status: pending)
5. Frontend chama Edge Function /run com URLs
6. Edge Function baixa imagens do Storage
7. Edge Function faz upload das imagens para RunningHub
8. Edge Function consome creditos (80)
9. Edge Function verifica fila (queue-manager/check)
10. Se slot disponivel: chama API RunningHub com nodeInfoList
11. Se fila cheia: enfileira via queue-manager/enqueue
12. RunningHub processa e envia webhook
13. Webhook delega para queue-manager/finish
14. queue-manager atualiza flyer_maker_jobs (status: completed, output_url)
15. Frontend recebe via Realtime e exibe resultado
16. Som de notificacao toca automaticamente
```

### O que NAO sera alterado

- Nenhuma outra ferramenta de IA sera modificada em sua logica
- Apenas adicoes nos sistemas centralizados (queue-manager, webhook, JobManager, RPCs)
- Componentes reutilizados do Arcano Cloner (ReferenceImageCard, PhotoLibraryModal, AspectRatioSelector adaptado, CreativitySlider adaptado, RefinePanel, RefinementTimeline)
