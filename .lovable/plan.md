
## Diagnóstico (com prova no banco)
O usuário **não está com 2 jobs**. Ele está com **1 job “fantasma”** que ficou preso como `queued` após dar erro no Upscaler.

Acabei de consultar e o job mais recente desse usuário é:
- **Tabela:** `upscaler_jobs`
- **id:** `c6a78951-734d-4577-831a-56bc8848d102`
- **status:** `queued`
- **waited_in_queue:** `false`
- **task_id / started_at / position:** `NULL`
- **user_credit_cost:** `0`
- **error_message:** `NULL`
- **created_at:** `2026-02-05 14:17:50+00`

Isso é exatamente o cenário que bloqueia o `/check-user-active` (porque ele vê `queued`) e impede o usuário de tentar de novo.

## Por que isso ainda acontece (causa raiz)
Mesmo com “upload primeiro”, ainda existe um ponto crítico:

1) **O frontend cria o job no banco com `status: 'queued'`**
   - Isso acontece em `UpscalerArcanoTool.tsx` (linha ~374+), antes do invoke.
2) Quando o invoke dá erro (“Edge Function returned a non-2xx”), **o job deveria virar `failed` imediatamente**.
3) Só que existem 2 situações que deixam o job preso:
   - **(A) Backend retorna non-2xx em caminhos de validação / rate limit / erro antes de marcar o job no banco**, e o job fica como estava (queued).
   - **(B) O frontend não executa o update de cleanup (ou falha) e não há um “failsafe” central** pra finalizar esse job imediatamente.

Além disso, o Upscaler de imagem **não tem o lock síncrono** `processingRef` que você já usa no Pose/Video/Veste, então clique duplo/rápido pode piorar o cenário (criando mais de um job e/ou estourando rate-limit).

## Objetivo que você exigiu (regra do sistema)
1) **Se deu erro, job não pode ficar em fila**: deve virar `failed` ou `cancelled` imediatamente.
2) **A única forma de ir pra fila** é se realmente **já existirem 3 jobs rodando** no limite global (somando ferramentas).
3) **Padrão único** de lógica (upload + criar job + start + fila + cleanup) para todas as ferramentas.

---

## O que vou implementar (refatoração padronizada e centralizada)

### Fase 1 — “Nunca mais fica queued por erro” (failsafe obrigatório)
#### 1.1 Backend: garantir finalização do job em QUALQUER retorno non-2xx
Arquivos:
- `supabase/functions/runninghub-upscaler/index.ts`
- `supabase/functions/runninghub-pose-changer/index.ts`
- `supabase/functions/runninghub-veste-ai/index.ts`
- `supabase/functions/runninghub-video-upscaler/index.ts`

Mudança padrão:
- Criar helper interno (dentro do próprio `index.ts`) tipo `markJobFailed(table, jobId, msg, code?)`.
- Em **todos** os retornos que hoje fazem `return new Response(..., { status: 400/429/500 })`:
  - Se `jobId` existir, **atualizar o job**:
    - `status='failed'`
    - `error_message='CODE: ...'`
    - `completed_at=now()`
- Importante para o seu caso: caminhos como **rate limit** e **validações** também precisam marcar o job.

Detalhe importante:
- Hoje o rate limit do `runninghub-upscaler` acontece antes de ler o body. Vou alterar para:
  - **Para `/run`**: ler JSON com try/catch (safe), extrair `jobId` e `userId`, aplicar rate limit e, se negar, **marcar job failed**.
  - Isso elimina “queued sem erro_message”.

#### 1.2 Queue Manager: “auto-heal agressivo” quando detecta queued fake
Arquivo:
- `supabase/functions/runninghub-queue-manager/index.ts` (`handleCheckUserActive`)

Hoje ele só auto-cancela órfão após 2 min. Vou ajustar para:
- Se `status='queued'` + `waited_in_queue=false` + `task_id/started_at/position` null + `user_credit_cost=0/null`:
  - auto-cancelar com threshold bem menor (ex.: 10–20s), porque isso **não é fila real**, é “starting/bug”.

Isso garante que mesmo que algum cliente “antigo cacheado” gere job quebrado, ele se auto-limpa quase instantâneo.

---

### Fase 2 — Centralizar lógica de “start job” no frontend (padrão único)
Criar um único hook utilitário e migrar as 4 ferramentas para usar o mesmo fluxo.

#### 2.1 Criar hook central: `useAiToolJobRunner`
Novo arquivo (frontend):
- `src/hooks/useAiToolJobRunner.ts` (ou `src/lib/ai-tools/jobRunner.ts`)

Ele padroniza:
1) `processingRef` (lock síncrono) — evita clique duplo e estourar rate limit
2) `checkActiveJob` antes de iniciar
3) Upload(s) primeiro (com paths padronizados por ferramenta + jobId)
4) Criar job no banco sempre com **status “não fila”** (ex.: `status='starting'`), e só virar `queued` se o backend realmente enfileirar.
5) Invoke do backend
6) Se invoke der erro:
   - marcar job `failed` (update direto) e
   - chamar um “failsafe” extra: endpoint que cancela job `queued` fake (ver Fase 3)

#### 2.2 Migrar ferramentas para o mesmo padrão
Arquivos:
- `src/pages/UpscalerArcanoTool.tsx`
- `src/pages/VideoUpscalerTool.tsx`
- `src/pages/PoseChangerTool.tsx`
- `src/pages/VesteAITool.tsx`

Padrão final idêntico entre todas:
- lock síncrono
- upload -> insert job `starting` -> invoke -> realtime update -> UI

---

### Fase 3 — “Botão/ação de destravar” e cancelamento do job da tentativa
Hoje o modal “Liberar fila” cancela `queued` via `cancel-session` por userId. Isso é bom, mas eu vou deixar mais preciso para não mexer na fila real indevidamente.

#### 3.1 Backend: novo endpoint `cancel-job` (preciso por jobId)
Arquivo:
- `supabase/functions/runninghub-queue-manager/index.ts`

Endpoint:
- `/cancel-job` com `{ table, jobId, userId }`
- Regra:
  - Só cancela se `job.user_id === userId` e `status='queued'`
  - Se `waited_in_queue=false`, é “queued fake/starting” => pode cancelar sempre
  - Se `waited_in_queue=true`, cancela somente se usuário confirmar (UI) — mantém sua regra de fila real

#### 3.2 Frontend: no catch do invoke, cancelar job automaticamente
- Se `invoke` falhar (non-2xx), além de marcar `failed`:
  - chamar `cancel-job` para garantir que não sobra nada “queued”.

---

## Como vou garantir a regra “só vai pra fila se já tem 3 rodando”
1) O **único lugar** que seta `waited_in_queue=true` e dá `position` será:
   - `runninghub-queue-manager/enqueue`
2) No backend das ferramentas, só chama `/enqueue` se `slotsAvailable <= 0`.
3) Se o `/check` do queue-manager falhar por qualquer motivo:
   - fallback: contar `running` nas 4 tabelas direto no banco (mesma lógica do queue-manager) para decidir.
   - Isso evita “enfileirar por engano” quando `/check` falha.

---

## Testes (obrigatórios, end-to-end)
1) Upscaler imagem: provocar erro proposital (ex.: estourar rate limit clicando rápido)
   - esperado: job vira `failed` e **não bloqueia retry**
2) Upscaler imagem: provocar erro de validação (mandar categoria inválida via dev)
   - esperado: job vira `failed`
3) Simular 3 jobs running (ou forçar via ambiente de teste)
   - esperado: 4º job vira `queued` com `waited_in_queue=true` e `position` preenchido
4) Repetir os 3 cenários acima para Pose / Veste / Video

---

## Arquivos que vou mexer (resumo)
Backend (funções):
- `supabase/functions/runninghub-upscaler/index.ts`
- `supabase/functions/runninghub-pose-changer/index.ts`
- `supabase/functions/runninghub-veste-ai/index.ts`
- `supabase/functions/runninghub-video-upscaler/index.ts`
- `supabase/functions/runninghub-queue-manager/index.ts` (auto-heal + cancel-job)

Frontend:
- `src/hooks/useAiToolJobRunner.ts` (novo)
- `src/pages/UpscalerArcanoTool.tsx`
- `src/pages/VideoUpscalerTool.tsx`
- `src/pages/PoseChangerTool.tsx`
- `src/pages/VesteAITool.tsx`
- `src/components/ai-tools/ActiveJobBlockModal.tsx` (ajustar para usar cancel-job quando status queued)

---

## Resultado final esperado
- Se o backend devolver qualquer erro: o job **não fica “queued”** preso.
- Retry funciona imediatamente.
- Fila só aparece quando o limite global estiver realmente cheio.
- Todas as ferramentas seguem exatamente a mesma lógica (um padrão único).
