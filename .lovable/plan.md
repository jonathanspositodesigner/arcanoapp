
Objetivo aprovado: fila global FIFO para todas as IAs, com regra prática rígida: job novo só deve entrar na fila quando os 3 slots globais estiverem ocupados (ou quando já existir fila anterior para preservar FIFO).

Diagnóstico confirmado no código atual (causas do erro de comportamento):
1) Auto-contagem indevida: quase todas as funções marcam `status='starting'` antes de consultar a fila, e o Queue Manager conta `starting` + `running`; isso pode “comer” slot e forçar fila cedo.
2) Caminhos duplicados: cada ferramenta decide fila e também chama RunningHub direto; o Queue Manager também chama RunningHub. Isso cria divergência de mapeamento (ex.: Arcano já corrigido; Flyer ainda divergente no node de aspect ratio; Upscaler tem diferenças de nós/parâmetros).
3) BG Remover ainda usa `quickQueueCheck` próprio (não centralizado), quebrando a regra de caminho único.

Plano de implementação (sem quebrar as ferramentas):
1) Centralizar decisão e execução no Queue Manager
- Criar endpoint único `/run-or-queue` no `runninghub-queue-manager`.
- Ele fará: (a) conferir ocupação global, (b) respeitar FIFO global, (c) iniciar ou enfileirar.
- Regra final: se `running/starting < 3` e `queued=0` => inicia imediato; senão => enfileira.
- Se houver fila antiga e slot livre, processa primeiro o mais antigo (FIFO) antes de aceitar “furar fila”.

2) Remover lógica duplicada de fila/start em TODAS as IAs
- Refatorar 8 funções (`upscaler`, `arcano`, `pose`, `veste`, `video`, `character`, `flyer`, `bg-remover`) para:
  - manter validação/upload/crédito como hoje;
  - trocar bloco “check + enqueue + run direto” por uma única chamada ao `/run-or-queue`.
- Remover atualização “early starting” antes da decisão de fila (principal causa de fila com 2 rodando).

3) Garantir caminho único real para rodar WebApp
- Toda chamada ao RunningHub passa por `startJobOnRunningHub` do Queue Manager.
- Sincronizar mapeamentos no Queue Manager com o comportamento já estável das ferramentas antes do corte:
  - Arcano: manter prompt (node 135) + aspect ratio 145.
  - Flyer: alinhar node de aspect ratio com fluxo atual da ferramenta.
  - Upscaler: alinhar nós opcionais/defaults (incluindo casos específicos).
  - Character refine: suportar variante de execução no Queue Manager (não deixar refine fora do caminho único).
  - BG Remover: remover `quickQueueCheck` local.

4) Proteção anti-quebra (rollout seguro)
- Deploy em ordem: `runninghub-queue-manager` primeiro, depois ferramentas uma a uma.
- Manter endpoints antigos (`/check`, `/enqueue`) temporariamente para compatibilidade durante transição.
- Não mexer no frontend nem em schema de banco nesta etapa (reduz risco).

Validação obrigatória (aceite):
- Cenário A: 2 em execução, 0 na fila -> novo job inicia direto (não fila).
- Cenário B: 3 em execução -> novo job entra na fila.
- Cenário C: existe fila anterior -> novo job respeita FIFO (entra atrás).
- Cenário D: mesmo payload de cada ferramenta gera mesmos nós no caminho direto/enfileirado (agora único caminho).
- Conferir estorno idempotente e transição de status (`pending/queued/starting/running/completed/failed`) sem regressão.

Arquivos-alvo principais:
- `supabase/functions/runninghub-queue-manager/index.ts` (núcleo)
- `supabase/functions/runninghub-upscaler/index.ts`
- `supabase/functions/runninghub-arcano-cloner/index.ts`
- `supabase/functions/runninghub-pose-changer/index.ts`
- `supabase/functions/runninghub-veste-ai/index.ts`
- `supabase/functions/runninghub-video-upscaler/index.ts`
- `supabase/functions/runninghub-character-generator/index.ts` (run + refine)
- `supabase/functions/runninghub-flyer-maker/index.ts`
- `supabase/functions/runninghub-bg-remover/index.ts`

Com esse desenho, a fila deixa de entrar indevidamente com 2 rodando (quando não há backlog) e você passa a ter 1 único caminho real para execução em todas as IAs.
