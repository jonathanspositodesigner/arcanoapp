

## Garantia de escopo (do jeito que você pediu)

Eu vou mexer **somente** no que envolve as 4 ferramentas de IA (Upscaler, Pose Changer, Veste AI, Video Upscaler) e na infraestrutura de fila/jobs delas (funções de backend + tabelas de jobs/créditos).  
**Não vou alterar**: modal de login da home, páginas admin, biblioteca, packs, rotas gerais, componentes fora de `ai-tools/*` e fora das páginas das ferramentas.

Também: **não vou rodar nenhuma migração de banco sem você aprovar explicitamente** (o sistema vai mostrar o SQL antes).

---

## Diagnóstico técnico do “funciona / não funciona / funciona / não funciona”

Hoje existe uma “fila central” (`runninghub-queue-manager`) que tenta iniciar jobs enfileirados, mas:

1) **Os jobs que entram em fila nem sempre ficam “prontos para iniciar” pelo gerenciador central**  
   - Em várias ferramentas, o banco guarda campos de input que **não são os mesmos** que o gerenciador central espera para iniciar depois (ex.: salva nome do arquivo do Storage/local, mas o gerenciador central precisa do identificador/URL certo para o provedor).  
   - Resultado: quando o job inicia “na hora”, ele roda pelo fluxo da própria ferramenta e dá certo; quando entra em fila, ele é iniciado por um caminho diferente e quebra. Isso explica a instabilidade.

2) **Reembolso em falha não está blindado de ponta a ponta**  
   - Existem caminhos onde o job termina em `failed`, mas o reembolso não acontece imediatamente e/ou pode acontecer em duplicidade em alguns cenários (timeout/cancel/webhook), porque não existe um “controle idempotente” claro no job.

3) **O Upscaler especificamente tem complexidade de workflows (categoria/versão/nós)**
   - Para iniciar um job do Upscaler a partir da fila, o backend precisa ter **persistido** toda a configuração necessária. Hoje isso não está garantido de forma consistente.

O seu pedido (“solução definitiva e centralizada”) é exatamente a correção estrutural disso.

---

## O que eu vou entregar (resumo obrigatório, para você validar antes de eu implementar)

### 1) Módulo central criado (nome e responsabilidade)
- **Frontend**: `src/ai/JobManager.ts` (ou `src/hooks/useAIJobManager.ts`)  
  Responsável por: **um único caminho** para criar job, subir arquivos, iniciar, acompanhar status, cancelar, exibir erro real.
- **Backend (fila/scheduler central)**: manter **uma única autoridade** em `supabase/functions/runninghub-queue-manager/index.ts`  
  Responsável por: regra dos 3 simultâneos, FIFO global, 1 job por usuário, start, finish, refund (idempotente).

### 2) Ferramentas repontadas para usar o módulo central
- `src/pages/UpscalerArcanoTool.tsx`
- `src/pages/PoseChangerTool.tsx`
- `src/pages/VesteAITool.tsx`
- `src/pages/VideoUpscalerTool.tsx`

### 3) Lógica que eu entendi (10–15 linhas)
- Limite global: no máximo **3 jobs ocupando vaga** ao mesmo tempo (`STARTING` ou `RUNNING`).
- Se já houver 3 ocupando vaga, o próximo job entra em `QUEUED` **FIFO global** (uma fila única entre as 4 ferramentas).
- Prioridade FIFO: se existe fila, **ninguém “fura”**; vagas liberadas sempre puxam o job mais antigo.
- 1 job por usuário: antes de aceitar um novo job, o backend verifica se o usuário já tem job em `QUEUED/STARTING/RUNNING` em qualquer ferramenta; se tiver, bloqueia com mensagem:  
  “Você já tem um processamento em andamento. Aguarde finalizar.”
- Erro é terminal: qualquer falha muda o job para `FAILED`, registra **a mensagem real** (sem mascarar) e libera o usuário imediatamente.
- Créditos: debitados de forma consistente (ponto único) e, em `FAILED/CANCELED`, ocorre **reembolso integral obrigatório**, com proteção contra reembolso duplicado.
- Webhook finaliza: `COMPLETED` ou `FAILED` só são gravados quando chega webhook (ou falha imediata ao iniciar).
- Anti-travamento: se um job não finalizar em tempo limite, ele é finalizado como `FAILED` e o usuário é liberado (sem ficar “processando para sempre”).

### 4) Estados finais e quando ocorrem
- `QUEUED`: entrou na fila FIFO (sem vaga).
- `STARTING`: vaga reservada; iniciando no provedor (ocupa vaga).
- `RUNNING/PROCESSING`: provedor confirmou início (ocupa vaga).
- `COMPLETED` (terminal): webhook de sucesso com output.
- `FAILED` (terminal): erro imediato ou webhook de falha; sempre com erro real; reembolso obrigatório.
- `CANCELED` (terminal): cancelado pelo usuário; reembolso obrigatório se já debitado.

### 5) Como eu garanto que não fica preso em “processando”
- Qualquer job que não receba webhook dentro do limite: finaliza `FAILED` e libera vaga/usuário.
- O JobManager do frontend também terá fallback leve (opcional e limitado) de leitura do status do job para não depender 100% de realtime.
- O backend roda “limpeza oportunista” e também terá um caminho determinístico para concluir o job em timeout.

---

## Plano de implementação (seguro, centralizado, sem quebrar o app)

### Fase A — Blindar o backend central (fila/scheduler) como “única fonte da verdade”
**Arquivos (somente IA):**
- `supabase/functions/runninghub-queue-manager/index.ts`
- `supabase/functions/runninghub-webhook/index.ts`
- `supabase/functions/runninghub-video-upscaler-webhook/index.ts`

**Mudanças:**
1) **Criar endpoints claros no QueueManager** (mantendo os existentes para compatibilidade):
   - `POST /schedule`  
     Entrada: `{ table, jobId }` (e opcionalmente `toolType`)  
     Ação: valida 1-job-por-usuário + aplica regra dos 3 + coloca em fila ou inicia imediatamente.
   - `POST /finish`  
     Entrada: payload do webhook (ou `{ table, jobId, status, outputUrl, errorMessage, taskId, rhCost }`)  
     Ação: finaliza job, reembolsa se falhou, libera vaga e chama `process-next`.
   - `POST /cancel-job`  
     Entrada: `{ table, jobId }`  
     Ação: cancela job e reembolsa se aplicável (idempotente).
   - `POST /check-user-active` (já existe)  
     Ajustar para considerar `STARTING` também.

2) **Consertar a regra de “ocupa vaga”**  
   - Contagens globais e por conta passam a considerar `STARTING` + `RUNNING` como ocupando vaga.

3) **Refund idempotente e obrigatório**  
   - Implementar reembolso apenas quando:
     - job foi debitado (`credits_charged = true`) e ainda não foi reembolsado (`credits_refunded = false`)
   - Ao reembolsar, marcar `credits_refunded = true` para nunca duplicar.

4) **Webhook passa a apenas encaminhar para o módulo central**  
   - `runninghub-webhook` e `runninghub-video-upscaler-webhook` vão:
     - parsear payload
     - chamar `QueueManager /finish`
     - retornar 200
   - Assim, a regra de finalização + refund + “puxar próximo da fila” fica em um lugar só.

> Importante: vou manter o padrão de bootstrap/imports das funções (nada de “migração” de estrutura proibida).

---

### Fase B — Ajustes mínimos de banco (somente IA) para suportar a centralização corretamente
**Por que isso é necessário:** sem persistir de forma consistente os dados que o scheduler precisa (e sem flags de débito/reembolso), você sempre vai ter “hora funciona, hora não”.

**Migração 100% restrita às ferramentas de IA:**
1) Adicionar colunas de controle financeiro e de estado:
   - Em **todas** as 4 tabelas de jobs:
     - `credits_charged boolean default false`
     - `credits_refunded boolean default false`
     - (opcional) `requested_credit_cost integer` para padronizar custo esperado, sem depender de payload do frontend

2) Upscaler: persistir config necessária para iniciar a partir da fila:
   - Em `upscaler_jobs`, adicionar campos mínimos:
     - `version text` (`standard|pro`)
     - `category text`
     - `framing_mode text` (`perto|longe`)
     - `editing_level numeric` (quando aplicável)
   - (Se preferir ainda mais robusto) um `job_payload jsonb` para qualquer futuro parâmetro sem precisar migrar de novo.

3) Atualizar as rotinas de limpeza/cancelamento (somente IA) para respeitar `credits_charged/credits_refunded` e também incluir `STARTING`:
   - `cleanup_all_stale_ai_jobs()`
   - `user_cancel_ai_job()` (se continuar sendo usado) ou deixar ele “legado” e mover o cancelamento pro endpoint central.

**Você vai ver o SQL antes. Se você não aprovar, eu não executo.**

---

### Fase C — Frontend: criar JobManager e repontar gradualmente as 4 ferramentas
**Arquivo novo (IA):**
- `src/ai/JobManager.ts` (ou `src/hooks/useAIJobManager.tsx`)

**Responsabilidades do JobManager (frontend):**
- `createJob(toolType, userId, payload, creditCost)`
  - Garante ordem segura: upload(s) -> insert job (sem órfão) -> invoke “prepare/run” -> subscribe realtime
- `subscribe(jobId, table)` com fallback leve e limitado
- `cancel(jobId, toolType)` chamando o endpoint central (não update direto em tabela)
- `getActiveJob(userId)` chamando o endpoint central
- Padronizar mensagens de erro vindas do backend sem mascarar

**Repontar páginas (somente IA):**
- Upscaler: remover lógica duplicada de:
  - insert job antes do upload (gera órfão)
  - controle de fila local
  - cancel update direto
- VideoUpscaler: idem (hoje cria job antes do upload)
- PoseChanger/VesteAI: já fazem upload antes do job (bom), mas vão migrar para:
  - criação e execução padronizadas via JobManager
  - cancel/refund via central
  - tratamento de erro padronizado

---

### Fase D — Limpeza “total” do código das ferramentas (como você pediu)
Depois que as 4 ferramentas estiverem rodando 100% pelo caminho central:

1) **Remover código duplicado** nas páginas:
   - lógica própria de fila por ferramenta
   - updates diretos de status em caso de cancel/erro que bypassam o central
2) **Aposentar hooks legados** se ficarem sem uso (por serem só das IA tools):
   - `useActiveJobCheck` (vira responsabilidade do JobManager)
   - `useQueueSessionCleanup` (vira responsabilidade do JobManager, mas de forma correta e sem “efeito colateral”)
   - `useProcessingButton` pode continuar (é só anti-duplo-clique), ou ser incorporado no JobManager
3) Manter somente:
   - UI + seleção de arquivos + preview
   - chamada única para JobManager

---

## Critérios de aceitação (o que eu vou validar antes de considerar “resolvido”)
1) Com 1 usuário: tentar iniciar 2 jobs em abas diferentes -> o segundo é bloqueado pelo backend com a mensagem correta.
2) Com 2+ usuários: disparar 4 jobs -> 3 iniciam, 1 entra em fila FIFO; ao concluir 1, o próximo inicia automaticamente.
3) Forçar falha (ex.: input inválido / provedor retorna erro):
   - job vira `FAILED`
   - erro exibido ao usuário exatamente como veio
   - créditos retornam integralmente
   - usuário consegue tentar de novo imediatamente (sem ficar preso em “processando”)
4) Se fechar a aba enquanto está na fila:
   - job é cancelado
   - não trava fila
   - não “come” crédito indevidamente

---

## Observação importante sobre “deploy faltando”
Pelo que eu vi no código, o problema principal não parece ser “falta de deploy” agora: o que está quebrando é **inconsistência estrutural** (jobs enfileirados iniciados por um caminho diferente e com dados incompatíveis). Mesmo com tudo deployado, vai continuar instável até centralizar e padronizar o ciclo de vida do job.

