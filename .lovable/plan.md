
Objetivo: corrigir a quebra geral das ferramentas de IA (falhas de geração) com foco em estabilidade de fila, inicialização de job e tolerância a erro transitório.

Diagnóstico confirmado (com evidência):
- Não é um problema só de modal.
- Logs de backend mostram várias respostas 502/504 em endpoints críticos:
  - `runninghub-queue-manager/check`
  - `runninghub-queue-manager/check-user-active`
  - `runninghub-arcano-cloner/run` e `runninghub-upscaler/run`
- No banco, há falhas em massa com:
  - `Falha ao iniciar: Edge Function não respondeu em 30s`
  - `Erro na função: Failed to send a request to the Edge Function`
- Em `arcano_cloner_jobs`, existe `step_history` avançado (download/upload/consumo de créditos) e mesmo assim o job foi marcado como `failed` por `pending_timeout` — ou seja: job estava vivo e foi “morto” pela limpeza agressiva.

Do I know what the issue is?
- Sim. O problema principal é arquitetural no `runninghub-queue-manager`:
  1) limpeza pesada roda em endpoints de alto tráfego (`/check` e `/check-user-active`);
  2) regra de “pending órfão” (30s) está agressiva e derruba jobs legítimos ainda inicializando;
  3) erros transitórios 502/504 no gateway não têm retry robusto no cliente.

Plano de correção (implementação):
1) Endurecer o Queue Manager (prioridade máxima)
- Arquivo: `supabase/functions/runninghub-queue-manager/index.ts`
- Remover `cleanupStaleJobs()` de:
  - `handleCheck()`
  - `handleCheckUserActive()`
- Manter limpeza apenas em fluxos menos frequentes (ex.: `handleFinish` / `handleProcessNext`) com throttle (ex.: 1 execução por janela de tempo).
- Ajustar `cleanupOrphanPendingJobs()`:
  - aumentar timeout de pending órfão (ex.: 30s → 180s/300s);
  - adicionar guardas para não matar job em progresso (ex.: se já houve avanço de etapa/estado de inicialização);
  - evitar classificar como órfão quando houver sinais de processamento ativo.

2) Marcar job como “starting” mais cedo nas funções de IA
- Arquivos-alvo:
  - `supabase/functions/runninghub-arcano-cloner/index.ts`
  - `supabase/functions/runninghub-upscaler/index.ts`
  - e as demais funções `runninghub-*` com padrão equivalente
- Mudança:
  - atualizar status do job para `starting` no início do `/run` (após validações básicas), antes de downloads/uploads/check de fila.
- Efeito:
  - evita que jobs legítimos fiquem longos em `pending` e sejam abatidos como órfãos.

3) Retry/resiliência no cliente para falhas transitórias do gateway
- Arquivos-alvo:
  - `src/ai/JobManager.ts`
  - páginas de ferramentas que invocam `supabase.functions.invoke(.../run)` diretamente (ex.: `UpscalerArcanoTool.tsx`, `ArcanoClonerTool.tsx`, etc.)
- Implementar helper de retry com backoff para erros transitórios:
  - “Failed to send a request to the Edge Function”
  - HTTP 502/504/429
- Evitar marcar `failed` no primeiro erro transitório; só falhar definitivamente após esgotar retries e sem progresso de status no banco.

4) Observabilidade para validar estabilização
- Após deploy, validar com 2 fluxos reais (Arcano Cloner + Upscaler):
  - job sai de `pending` para `starting/running` sem ser morto por `pending_timeout`;
  - queda de 502/504 em `/check` e `/check-user-active`;
  - sem novos fails com “Edge Function não respondeu em 30s”.
- Consultas de verificação:
  - contagem de falhas por `error_message` nas últimas 2h;
  - tempos de resposta de `runninghub-queue-manager/*` nos logs.

Resultado esperado:
- Ferramentas voltam a gerar normalmente.
- Redução forte das falhas intermitentes.
- Fila continua protegendo concorrência sem derrubar jobs válidos.
