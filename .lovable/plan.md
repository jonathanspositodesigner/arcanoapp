
Diagnóstico resumido (com base no código + logs + banco)

- O job do Arcano Cloner está concluindo no backend: últimos registros em `arcano_cloner_jobs` estão `status=completed` com `output_url` preenchida.
- O problema do “resultado quebrado” é no carregamento da imagem final no frontend:
  - `ArcanoClonerTool.tsx` e `ClonerTrialMockup.tsx` renderizam `<img src={outputUrl}>` direto, sem fallback resiliente.
  - A URL final vem do CDN externo do RunningHub (`rh-images...ap-beijing...`), que pode ficar lenta/instável para parte dos usuários (latência/região/bloqueio intermitente), gerando imagem quebrada.
- A lentidão sistêmica foi identificada no fluxo de webhook:
  - O mesmo `taskId` está chegando várias vezes no `runninghub-webhook` em intervalos ~20s.
  - O webhook está demorando ~17s para responder porque aguarda `/finish` completo.
  - `/finish` faz operações pesadas síncronas (cleanup global, process-next, push, etc.), o que aumenta tempo de resposta e provoca retries do provedor, criando efeito cascata de lentidão.

Do I know what the issue is?
- Sim. São 2 causas combinadas:
  1) Preview final dependente de CDN externo lento/instável sem fallback robusto.
  2) Webhook não idempotente/rápido o suficiente, gerando retries duplicados e sobrecarga.

Plano de correção permanente

1) Tornar webhook idempotente e rápido (eliminar duplicações)
- Arquivo: `supabase/functions/runninghub-webhook/index.ts`
- Ajustes:
  - Buscar também `status` do job no lookup.
  - Se job já estiver terminal (`completed/failed/cancelled`), retornar `200` imediatamente sem chamar `/finish` novamente.
  - Manter processamento mínimo e resposta curta para evitar timeout do provedor.

2) Blindar `/finish` contra retrabalho e reduzir latência
- Arquivo: `supabase/functions/runninghub-queue-manager/index.ts`
- Ajustes:
  - No início do `handleFinish`, checar estado atual do job; se já terminal, retornar sucesso sem side effects (idempotência real).
  - Tirar `cleanupStaleJobs()` do caminho crítico de `/finish` (rodar em endpoint/cron dedicado).
  - Não bloquear resposta com tarefas secundárias (push/process-next) — executar de forma assíncrona após persistir estado principal.
  - Garantir que só a primeira finalização dispara thumbnail/push/process-next.

3) Usar preview estável local no Arcano Cloner (não depender do CDN externo para render principal)
- Arquivos:
  - `src/pages/ArcanoClonerTool.tsx`
  - `src/components/arcano-cloner/trial/ClonerTrialSection.tsx`
  - `src/components/arcano-cloner/trial/ClonerTrialMockup.tsx`
- Ajustes:
  - Introduzir estado de `previewUrl` separado de `outputUrl`.
  - Fallback de preview: `thumbnail_url` (Storage local) → proxy interno (`download-proxy`) → `output_url` original.
  - Substituir `<img>` simples por `ResilientImage` no resultado (com retry e fallback visual).
  - Manter `output_url` original para “Baixar HD”, sem perder qualidade.

4) Garantir atualização do preview após conclusão
- Arquivos:
  - `src/pages/ArcanoClonerTool.tsx`
  - `src/hooks/useJobStatusSync.ts` (se necessário)
- Ajustes:
  - Ao receber `status=completed`, fazer fetch pontual do job para capturar `thumbnail_url` já gerada.
  - Se thumbnail ainda não existir, tentar novamente uma vez após curto delay.
  - Evitar depender só de mudança de status para atualizar URL de preview.

5) Observabilidade e validação final
- Validação técnica:
  - Confirmar 1 único `/finish` efetivo por `taskId`.
  - Confirmar fim dos retries repetidos no `runninghub-webhook`.
  - Confirmar tempo de resposta do webhook abaixo do limiar de retry.
- Validação funcional:
  - Gerar imagem no Arcano Cloner (desktop + mobile), verificar preview sem quebrar.
  - Confirmar download HD funcionando.
  - Confirmar que, mesmo com falha de CDN externo, preview local continua abrindo.

Arquivos previstos para alteração

- `supabase/functions/runninghub-webhook/index.ts`
- `supabase/functions/runninghub-queue-manager/index.ts`
- `src/pages/ArcanoClonerTool.tsx`
- `src/components/arcano-cloner/trial/ClonerTrialSection.tsx`
- `src/components/arcano-cloner/trial/ClonerTrialMockup.tsx`
- (opcional) `src/utils/getPreviewUrl.ts` para centralizar lógica de fallback
