
Objetivo: corrigir definitivamente a geração de vídeo para não falhar por mapeamento incorreto e não deixar jobs presos, usando os IDs/nodes que você enviou.

1) Diagnóstico confirmado (com base no código + banco)
- Os WebApp IDs estão corretos no backend:
  - Veo 3.1 imagem: 2037253069662068738
  - Veo 3.1 texto: 2037271484384681986
  - Wan 2.2 imagem: 2037260767040380929
  - Wan 2.2 texto: 2037277392862973953
- O erro atual é de node mapping no Veo 3.1 texto:
  - Falha registrada: `NODE_INFO_MISMATCH(nodeId=3, fieldName=aspect_ratio, reason=node_not_found_in_workflow)`.
  - No código, Veo texto ainda envia `nodeId=3`; na sua especificação correta deve ser `nodeId=8`.
- Há também fragilidade de “limpeza de travados”:
  - `cleanup_all_stale_ai_jobs` ainda não cobre `video_generator_jobs`.
  - O parser do queue manager espera `cancelled_count`, mas a RPC atual retorna colunas por ferramenta (shape diferente), então a contabilização fica inconsistente.

2) Correção principal de mapeamento (RunningHub)
- Ajustar no `runninghub-queue-manager`:
  - Veo 3.1 texto-only (`veo3.1_text_only`) -> usar `nodeId=8` para:
    - `aspect_ratio`
    - `prompt`
  - Veo 3.1 com imagens mantém `nodeId=3` (como você enviou).
  - Wan 2.2 imagem/texto permanece igual (já está coerente com sua spec).
- Resultado esperado: elimina erro 803 no texto->vídeo do Veo.

3) Hardening para evitar quebra futura de nó
- Adicionar fallback automático para vídeo quando houver erro de node mismatch (803):
  - Se Veo texto falhar com node 8, tentar 1 retry com node alternativo (3) antes de falhar final.
  - Se Veo imagem falhar com node 3, tentar 1 retry com node alternativo (8) para campos textuais.
- Registrar no `step_history` qual mapeamento foi usado em cada tentativa para auditoria rápida.

4) Blindagem anti “pending eterno”
- Atualizar RPC `cleanup_all_stale_ai_jobs` para incluir `video_generator_jobs` com estorno idempotente.
- Ajustar `cleanupStaleJobs()` no queue manager para somar corretamente o novo formato de retorno da RPC (colunas por ferramenta).
- Refinar `cleanupOrphanPendingJobs`:
  - manter proteção para jobs realmente em progresso,
  - mas marcar como falho jobs de vídeo `pending + task_id null` acima do timeout de estagnação, mesmo com step_history, via `mark_pending_job_as_failed` (para garantir estorno).

5) Robustez de UI (feedback e recuperação)
- Integrar `useJobStatusSync` na página `GerarVideoTool` (além do realtime), para polling de backup quando realtime falhar/aba dormir.
- Manter watchdog de pending e fallback `markJobAsFailedInDb` já existente, mas garantir reset consistente de estado visual em toda falha terminal.

6) Validação completa (pós-correção)
- Executar testes de ponta a ponta nos 4 cenários:
  - Veo 3.1 texto-only
  - Veo 3.1 com imagens
  - Wan 2.2 texto-only
  - Wan 2.2 com imagens
- Verificar para cada cenário:
  - criação do job,
  - transição `pending -> starting/running -> completed/failed`,
  - existência de `task_id` quando aceito pela RunningHub,
  - estorno automático em falha,
  - ausência de jobs `pending` antigos sem progresso.
- Confirmar no banco/logs que o erro 803 desapareceu no Veo texto.

Detalhes técnicos (arquivos que serão alterados)
- `supabase/functions/runninghub-queue-manager/index.ts`
  - mapeamento Veo texto (node 8), fallback de node, parser de cleanup
- Nova migration SQL
  - `cleanup_all_stale_ai_jobs` com `video_generator_jobs` + retorno consistente
- `src/pages/GerarVideoTool.tsx`
  - incluir `useJobStatusSync` para recuperação de status quando realtime falhar

Resultado esperado final
- Veo 3.1 texto volta a iniciar normalmente.
- Fluxos com imagem continuam funcionais.
- Sem jobs presos eternamente em pending.
- Estorno de crédito garantido em falha.
