
Contexto e diagnóstico (o que aconteceu de verdade)
- O taskId que você passou (2019424519973900289) existe no banco e está assim agora:
  - tabela: upscaler_jobs
  - jobId: 26b6b8a2-ea9f-4c8d-8c67-da3b79f0b47f
  - status: running
  - started_at: 2026-02-05 14:54:58+00
  - completed_at: NULL
  - error_message: NULL
  - waited_in_queue: false (não é fila real)
  - api_account: primary
- Ou seja: a tela fica “Processando” porque o backend nunca recebeu (ou nunca processou) o sinal de término/falha para virar status=failed/completed. Sem essa atualização, o Realtime não tem como “avisar” o frontend que falhou.
- Isso não é “o job foi pra fila por erro”. Esse caso específico está pior: ele ficou “rodando” para sempre, o que trava o usuário (porque o /check-user-active vê um running).

Causa raiz (por quê isso está acontecendo)
1) Dependência de webhook para finalizar status
   - Hoje o fluxo de término depende do RunningHub chamar o webhook (/functions/v1/runninghub-webhook) com TASK_END.
   - Se esse webhook não chega (ou chega e falha silenciosamente), o job fica “running” eternamente.
2) Não existe “watchdog/reconciliação” para jobs running antigos
   - Não há uma verificação periódica que consulte o status real do taskId no RunningHub e force a atualização do banco (SUCCESS/FAILED).
3) O frontend, por padrão, só reage ao que está no banco (Realtime). Se o banco não muda, a UI não muda.

O que vou implementar para isso nunca mais acontecer (e também te dar a causa exata do erro)
Fase 0 (diagnóstico imediato e motivo exato da falha)
- Criar um endpoint de backend no runninghub-queue-manager:
  - /query-task (ou /reconcile-task)
  - Entrada: { table, jobId } (ou { taskId } opcional)
  - Ele vai chamar o endpoint oficial do RunningHub /openapi/v2/query com a API key correta (pela coluna api_account; fallback primary).
  - Saída: { status, errorCode, errorMessage, results }.
- Com isso, eu consigo olhar esse taskId 2019424519973900289 e gravar no job:
  - se FAILED: status=failed, error_message=errorMessage, completed_at=now()
  - se SUCCESS: status=completed, output_url=results[0].url, completed_at=now()
- Isso responde “por que deu erro” com o errorMessage real vindo do RunningHub, e corrige a UI na hora.

Fase 1 (correção definitiva: “se falhou, nunca fica processando”)
1) Watchdog de jobs “running” (anti-travamento)
- No backend (runninghub-queue-manager), adicionar uma rotina reconcileStaleRunningJobs():
  - Busca jobs status=running com started_at muito antigo (ex.: > 8-12 minutos para imagem; você pode ajustar por ferramenta).
  - Para cada job, chama RunningHub /openapi/v2/query(taskId).
  - Se retornar FAILED ou SUCCESS, atualiza o job no banco imediatamente e libera o slot.
  - Se o RunningHub responder “task inexistente”/erro: marcar failed com código tipo RUNNINGHUB_TASK_NOT_FOUND.
2) Onde esse watchdog roda
- Rodar reconcileStaleRunningJobs() automaticamente em endpoints que já são chamados o tempo todo:
  - /check
  - /check-user-active
  - /process-next
  Assim mesmo sem cron/scheduler, o sistema se auto-corrige sempre que alguém usa a plataforma.
3) Atualização de custos e finalização
- Quando reconciliar e finalizar:
  - preencher rh_cost baseado em (completed_at - started_at) para manter consistência
  - setar completed_at sempre que finalizar (failed/completed/cancelled)

Fase 2 (regra que você exigiu: “fila só existe quando realmente tem 3 rodando”)
- O backend das ferramentas já usa o queue-manager /check para decidir se enfileira.
- Ajuste necessário (para não “enfileirar por engano” quando /check falhar):
  - Se o /check falhar, NÃO assumir slotsAvailable=0 automaticamente.
  - Em vez disso, fazer fallback contando globalRunning direto no banco (mesma lógica do queue-manager), e só enfileirar se globalRunning >= maxConcurrent.
- E reforçar a regra:
  - Somente o /enqueue do queue-manager pode setar waited_in_queue=true e position>0.
  - “queued fake” (waited_in_queue=false) vira proibido no fluxo normal.

Fase 3 (frontend: parar de depender 100% do webhook para refletir falha)
1) Poll de reconciliação enquanto “processing”
- Em todas as ferramentas, enquanto status=processing/running:
  - a cada 10-20s o frontend chama /reconcile-task passando (table, jobId)
  - se a tarefa já terminou no RunningHub, o backend atualiza o banco e o Realtime derruba a UI para failed/completed
- Isso elimina o cenário “falhou lá, mas aqui fica processando”.
2) Botão de “Verificar status agora” + “Cancelar”
- Se o usuário estiver preso em processing há muito tempo:
  - botão “Verificar status” (chama reconcile)
  - botão “Cancelar” (chama cancel-job se for queued; e se for running, marca como failed/cancelled localmente e desbloqueia o usuário, com mensagem clara)

Fase 4 (padronização total: uma lógica única para todas as ferramentas)
- Criar um hook único no frontend (useAiToolJobRunner) para:
  - lock síncrono (processingRef)
  - upload(s) primeiro
  - criar job com status='starting' (não queued)
  - chamar backend /run
  - lidar com retorno queued vs running
  - em qualquer erro: marcar job failed + chamar cancel-job (failsafe)
  - iniciar o poll de reconcile enquanto estiver processando
- Migrar Upscaler imagem, Vídeo, Pose, Veste para usar esse hook e remover lógica duplicada.
- Resultado: todas as ferramentas seguem o mesmo padrão e nenhum “estado fantasma” fica na UI.

Plano de validação (pra provar que não vai travar mais)
1) Reproduzir o caso do taskId atual
- Usar /reconcile-task para obter o status real do 2019424519973900289 e gravar failed/completed no banco.
- Confirmar que a UI sai de “Processando” imediatamente.
2) Simular “webhook não chega”
- Desligar/impedir webhook (simulação via código/flag) e validar que o poll + watchdog finaliza mesmo assim.
3) Confirmar regra da fila
- Com 0-2 jobs running: novo job deve ir direto para running, nunca queued.
- Com 3 jobs running: novo job deve entrar queued com waited_in_queue=true e position preenchido.

Entrega (arquivos que serão mexidos)
Backend:
- supabase/functions/runninghub-queue-manager/index.ts
  - adicionar /reconcile-task (ou /query-task)
  - reconcileStaleRunningJobs() e fallback de /check
- (opcional) pequenos ajustes de consistência nos backends das ferramentas, se ainda existirem lugares que setam queued indevidamente

Frontend:
- src/hooks/useAiToolJobRunner.ts (novo)
- src/pages/UpscalerArcanoTool.tsx
- src/pages/VideoUpscalerTool.tsx
- src/pages/PoseChangerTool.tsx
- src/pages/VesteAITool.tsx
- (opcional) ActiveJobBlockModal para oferecer “Verificar status”/“Cancelar”

Resultado esperado após isso
- Se falhar no RunningHub: em poucos segundos o job vira failed no banco e na UI (mesmo sem webhook).
- Não existe “job falhou e ficou processando”.
- Fila só aparece quando o limite global estiver realmente ocupado.
- Todas as ferramentas ficam 100% padronizadas (mesmo fluxo, mesmas regras, mesmos failsafes).
