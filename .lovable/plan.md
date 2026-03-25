

# Auditoria Completa: Gerar Imagem via RunningHub

## Resultado da Auditoria

O fluxo principal (frontend → edge function → queue manager → RunningHub → webhook → resultado) está **corretamente implementado**. A arquitetura segue o padrão idêntico das outras ferramentas. Porém, existem **5 falhas críticas** nas RPCs do banco de dados que precisam ser corrigidas via migração SQL.

---

## O QUE ESTÁ FUNCIONANDO

- **Frontend (GerarImagemTool.tsx)**: 100% RunningHub, zero referências ao Google. Hooks corretos (useJobStatusSync, useJobPendingWatchdog, useProcessingButton, useQueueSessionCleanup). Drag/drop, paste, 5 referências, aspect ratios corretos.
- **Edge Function (runninghub-image-generator)**: Auth JWT, rate limit, validação de domínio, upload para RH, consumo de créditos, delegação ao queue manager, reconcile, queue-status. Tudo OK.
- **Queue Manager**: WebApp ID `2036803905421582337` correto, node mapping (145/aspectRatio, 135/text, 58/147/148/149/62/150 imagens) correto, `image_generator_jobs` em JOB_TABLES e TOOL_CONFIG. Fila FIFO global funcional.
- **Webhook**: `image_generator_jobs` já está no array IMAGE_JOB_TABLES. Callbacks retornam corretamente.
- **JobManager.ts**: `image_generator` mapeado em TABLE_MAP, EDGE_FUNCTION_MAP e TOOL_NAMES.
- **Frontend admin (AdminAIToolsUsageTab.tsx)**: Filtro "Gerar Imagem" → "image_generator_jobs" mapeado.

---

## 5 FALHAS ENCONTRADAS (Requerem Migração SQL)

### 1. `cleanup_all_stale_ai_jobs` — NÃO inclui `image_generator_jobs`
A última versão (migração 20260311) para em `bg_remover_jobs`. Jobs de "Gerar Imagem" que travarem por 10+ minutos **não serão limpos automaticamente** nem terão créditos estornados.

### 2. `mark_pending_job_as_failed` — NÃO inclui `image_generator_jobs`
A última versão (migração 20260311) para em `bg_remover_jobs`. O watchdog do frontend (linha 315 de GerarImagemTool.tsx) chama essa RPC, mas ela retorna `FALSE` para `image_generator_jobs`, deixando jobs órfãos em `pending` para sempre.

### 3. `user_cancel_ai_job` — NÃO inclui `image_generator_jobs`
A última versão (migração 20260311) para em `bg_remover_jobs`. O botão "Cancelar" no frontend chama essa RPC, mas ela retorna "Tabela inválida", impedindo o cancelamento de jobs.

### 4. `get_ai_tools_usage` (ambas versões) + `get_ai_tools_usage_count` + `get_ai_tools_usage_summary` — NÃO incluem `image_generator_jobs`
A última versão (migração 20260316) para em `bg_remover_jobs`. Jobs de "Gerar Imagem" **não aparecem** no dashboard admin de Custos IA.

### 5. `useNotificationTokenRecovery` — NÃO suporta `image_generator_jobs`
O tipo `SupportedToolTable` (src/hooks/useNotificationTokenRecovery.ts) não inclui `image_generator_jobs`. Notificações push funcionam (via queue manager), mas ao tocar na notificação, o resultado não é recuperado automaticamente.

---

## Plano de Correção

### Step 1: Migração SQL
Uma única migração que atualiza todas as 6 RPCs para incluir `image_generator_jobs`:

1. **`cleanup_all_stale_ai_jobs`** — Adicionar bloco `IMAGE GENERATOR JOBS` com loop de limpeza + estorno idêntico aos outros
2. **`mark_pending_job_as_failed`** — Adicionar `ELSIF p_table_name = 'image_generator_jobs'` nos dois blocos (SELECT e UPDATE)
3. **`user_cancel_ai_job`** — Adicionar `ELSIF p_table_name = 'image_generator_jobs'` nos três blocos (SELECT, refund, UPDATE)
4. **`get_ai_tools_usage`** (paginada) — Adicionar UNION ALL para `image_generator_jobs` com tool_name `'Gerar Imagem'`
5. **`get_ai_tools_usage`** (filtrada) — Adicionar UNION ALL para `image_generator_jobs`
6. **`get_ai_tools_usage_count`** — Adicionar UNION ALL para contagem
7. **`get_ai_tools_usage_summary`** — Adicionar UNION ALL para resumo
8. **`get_ai_tools_cost_averages`** — Adicionar UNION ALL (se existir versão mais recente)

### Step 2: useNotificationTokenRecovery
Adicionar `'image_generator_jobs'` ao tipo `SupportedToolTable` e ao `TABLE_SELECT_MAP`. Remover o comentário "skip for now" em GerarImagemTool.tsx e ativar o hook.

---

## Detalhes Técnicos

- **Arquivos alterados**: 1 migração SQL nova, `src/hooks/useNotificationTokenRecovery.ts`, `src/pages/GerarImagemTool.tsx` (linhas 130-131)
- **Risco**: Zero. As alterações só adicionam suporte a uma tabela já existente em funções que já tratam outras tabelas idênticas.
- **Sem alteração no fluxo principal**: O pipeline RunningHub → Queue Manager → Webhook já funciona. Apenas os mecanismos de proteção (cleanup, cancel, watchdog) e relatórios admin estão incompletos.

