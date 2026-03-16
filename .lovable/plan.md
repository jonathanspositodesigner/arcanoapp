
Objetivo: eliminar jobs presos em `pending` e reduzir falhas de inicialização para quase zero, com tratamento híbrido (reconciliar primeiro, falhar/estornar depois).

Diagnóstico confirmado (com evidência real):
- Hoje há job órfão em `arcano_cloner_jobs`:
  - `4482d67f-8f8f-4d94-a3da-20ebd8a11f50` em `pending`, `task_id = null`, `step_history = null`, >10 min.
- Padrão recente de falhas:
  - `arcano_cloner_jobs`: várias falhas `failed_at_step = pending_timeout`.
  - `upscaler_jobs`: várias falhas com `Erro na função: Failed to send a request to the Edge Function`.
- Há casos com `step_history` avançado e mesmo assim terminando em `pending_timeout`, indicando watchdog/cleanup matando job por critério incompleto.

Causas-raiz encontradas no código:
1) Frontend cria job `pending` e, se `invoke` falha, várias páginas só fazem `setStatus('error')` sem fechar o job no banco.
- Arquivos afetados: `ArcanoClonerTool.tsx`, `PoseChangerTool.tsx`, `VesteAITool.tsx`, `VideoUpscalerTool.tsx`, `RemoverFundoTool.tsx`, `FlyerMakerTool.tsx`, `GeradorPersonagemTool.tsx`.
- Só `UpscalerArcanoTool.tsx` já marca `failed` via RPC no catch.

2) Watchdog é desativado cedo demais:
- `enabled: status !== 'idle' && status !== 'completed' && status !== 'error'`.
- Quando erro de rede acontece, status vira `error` e watchdog para antes de corrigir o `pending` no banco.

3) `useJobPendingWatchdog` decide só por `status='pending' + task_id null + idade`, sem checar `step_history/current_step`.
- Pode classificar como órfão jobs que já estavam avançando internamente.

4) `runninghub-video-upscaler` está inconsistente com as demais funções:
- Não faz “early status update” para `starting` no início de `/run`.
- Isso aumenta janela de ficar em `pending`.

5) Limpeza de órfãos depende de tráfego (`/finish`/`/process-next`), então sem novos eventos alguns `pending` ficam vivos por muito tempo.

Plano de implementação (correção):
1) Fechamento defensivo no frontend (principal)
- Em todas as páginas de IA listadas acima:
  - após criar job e antes de sair no `catch`, chamar `rpc('mark_pending_job_as_failed', ...)` com mensagem detalhada.
  - manter `jobId` para esse fluxo e nunca deixar `pending` sem transição terminal.
- Padronizar em helper reutilizável para evitar divergência futura.

2) Ajuste do watchdog para não desligar prematuramente + evitar falso positivo
- `enabled` deve depender de job ativo, não do estado visual de erro.
  - Ex.: ativo enquanto existir `jobId` e o job não estiver terminal no banco.
- Em `useJobPendingWatchdog.ts`:
  - incluir leitura de `current_step` e `step_history`.
  - só marcar `failed` se realmente órfão (sem progresso real).

3) Padronizar `runninghub-video-upscaler`
- Em `supabase/functions/runninghub-video-upscaler/index.ts`:
  - atualizar para `status='starting'` logo após validações (como outras tools).
  - registrar `current_step/step_history`.
  - reduzir janela de `pending` antes de fila/provedor.

4) Tratamento híbrido de órfãos já existentes (decisão confirmada: “Híbrido”)
- Fluxo automático:
  - `pending` com sinais de progresso (`step_history/current_step`): tentar reconciliação por janela curta.
  - sem progresso real após janela: marcar `failed` + estorno idempotente quando aplicável.
- Aplicar primeiro no job órfão atual e em backlog recente.

5) Limpeza contínua sem depender de tráfego
- Adicionar rotina periódica leve para varrer órfãos (`pending/starting/queued` acima de thresholds), sem custo alto de endpoint crítico.
- Manter regras seguras para não matar job vivo.

Arquivos-alvo:
- `src/hooks/useJobPendingWatchdog.ts`
- `src/pages/ArcanoClonerTool.tsx`
- `src/pages/PoseChangerTool.tsx`
- `src/pages/VesteAITool.tsx`
- `src/pages/VideoUpscalerTool.tsx`
- `src/pages/RemoverFundoTool.tsx`
- `src/pages/FlyerMakerTool.tsx`
- `src/pages/GeradorPersonagemTool.tsx`
- `supabase/functions/runninghub-video-upscaler/index.ts`
- (se necessário para rotina híbrida) `supabase/functions/runninghub-queue-manager/index.ts`

Validação pós-correção:
- Consulta de saúde:
  - `pending > 3 min` deve tender a zero.
  - sem novos `pending_timeout` com `step_history` preenchido.
- Teste de caos controlado:
  - simular falha de `invoke` e confirmar transição automática para `failed` (sem ficar `pending`).
- Fluxo real:
  - Arcano Cloner e Video Upscaler: criar job, enfileirar/iniciar, concluir/falhar com motivo detalhado e sem órfão.
