

# Correção Definitiva: Geração de Vídeo — Jobs Pendentes Eternamente

## Diagnóstico (Causa Raiz)

Analisei os 4 jobs travados em `pending` no banco. Todos estão parados no passo `uploading_frames` há horas, com `credits_charged=false` e `user_credit_cost=0`. O problema é uma **cascata de 5 bugs** que se combinam:

### Bug 1 — Frame upload falha silenciosamente
A Edge Function `generate-video` faz upload dos frames para a RunningHub. Se o upload falha (timeout, rede), o catch block marca o job como `failed`. **MAS** se a Edge Function inteira crasha ou dá timeout do Supabase (60s) durante o upload, o job fica preso em `pending` com `current_step=uploading_frames` para sempre.

### Bug 2 — credits_charged nunca é marcado como true
O campo `credits_charged` e `user_credit_cost` só são atualizados na linha 408-412, **DEPOIS** do upload de frames. Os créditos já foram consumidos via RPC (linha 317), mas o job registra `credits_charged=false` e `user_credit_cost=0`. Resultado: **nenhum mecanismo de cleanup consegue estornar os créditos**, pois todos checam `credits_charged=true`.

### Bug 3 — `video_generator_jobs` AUSENTE das RPCs críticas
As funções SQL `mark_pending_job_as_failed`, `user_cancel_ai_job` e `cleanup_all_stale_ai_jobs` **NÃO incluem** `video_generator_jobs`. Isso significa:
- O watchdog do frontend (`useJobPendingWatchdog`) chama a RPC que retorna `FALSE` silenciosamente
- O usuário não consegue cancelar o job
- O cleanup automático de 10 minutos não limpa esses jobs

### Bug 4 — Cleanup de órfãos PULA jobs com step_history
O `cleanupOrphanPendingJobs` no queue-manager pula qualquer job com `step_history.length > 0`. Os jobs de vídeo travados têm 3 entries no step_history (`created`, `consuming_credits`, `uploading_frames`), então são **deliberadamente ignorados**.

### Bug 5 — Frontend sem watchdog nem useJobStatusSync
A página `GerarVideoTool.tsx` **NÃO usa** `useJobPendingWatchdog` nem `useJobStatusSync`. Usa apenas um Realtime subscription manual. Se o Realtime falhar, o usuário fica olhando um spinner infinito. Além disso, `video_generator` não existe no `ToolType` do `JobManager.ts`.

---

## Plano de Execução em 2 Fases

### FASE 1 — Hotfix Imediato (destravar tudo)

**1.1 Migração SQL: Adicionar `video_generator_jobs` a todas as RPCs**
- `mark_pending_job_as_failed` — adicionar branch `ELSIF p_table_name = 'video_generator_jobs'`
- `user_cancel_ai_job` — adicionar branch para `video_generator_jobs`
- `cleanup_all_stale_ai_jobs` — adicionar loop para `video_generator_jobs` com estorno

**1.2 Script de recuperação: Falhar + estornar os 4 jobs pendentes**
- Via insert tool, marcar os 4 jobs como `failed` com `completed_at=NOW()`
- Verificar quais tiveram créditos realmente consumidos (pela tabela de transações) e estornar via `refund_upscaler_credits`

**1.3 Edge Function `generate-video`: Mover `credits_charged=true` para ANTES do upload**
- Atualizar `credits_charged=true` e `user_credit_cost` imediatamente após consumir créditos (linha ~340), ANTES de tentar upload de frames
- Isso garante que qualquer mecanismo de cleanup/estorno funcione corretamente

### FASE 2 — Endurecimento Completo

**2.1 Frontend: Integrar watchdog + useJobStatusSync**
- Adicionar `'video_generator'` ao `ToolType` em `JobManager.ts`
- Adicionar `video_generator_jobs` ao `TABLE_MAP` e `EDGE_FUNCTION_MAP`
- Refatorar `GerarVideoTool.tsx` para usar `useJobStatusSync` (polling + realtime + visibility recovery)
- Adicionar `useJobPendingWatchdog` com timeout de 5 minutos (300s) para o passo de upload
- Adicionar `markJobAsFailedInDb` no catch block do `handleGenerate`

**2.2 Edge Function `generate-video`: Timeout de segurança no upload**
- Adicionar AbortController com timeout de 60s por frame upload (já tem 30s no fetchWithRetry, mas o total pode exceder 60s do Supabase)
- Se upload falhar, garantir estorno usando `credits_charged=true` (corrigido em 1.3)

**2.3 Frontend: Adicionar `markJobAsFailedInDb` no `useJobPendingWatchdog`**
- O `TABLE_NAME_MAP` no watchdog já inclui `video_generator_jobs` — basta garantir que o `ToolType` esteja correto

---

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| **Nova migração SQL** | Adicionar `video_generator_jobs` a 3 RPCs |
| `supabase/functions/generate-video/index.ts` | Mover `credits_charged` para antes do upload |
| `src/ai/JobManager.ts` | Adicionar `video_generator` ao ToolType e mapas |
| `src/pages/GerarVideoTool.tsx` | Integrar `useJobStatusSync`, `useJobPendingWatchdog`, `markJobAsFailedInDb` |
| `src/hooks/useJobPendingWatchdog.ts` | Confirmar que `video_generator` está no map (já está) |
| `src/utils/markJobAsFailedInDb.ts` | Confirmar que `video_generator` está no map (já está) |

## Impacto nos Créditos dos Usuários Afetados

- User `47f9ed26`: 750 + 400 = **1.150 créditos** a estornar
- User `09c5f4d6`: 750 + 750 = **1.500 créditos** a estornar (2 jobs com Veo 3.1)

