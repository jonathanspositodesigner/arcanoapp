
## O que está acontecendo (diagnóstico com evidência)
Você está certo em ficar puto: o job **já concluiu na RunningHub (SUCCESS)**, mas **o nosso backend não está finalizando o job no banco**, então o frontend fica preso em “processando” porque o `useJobStatusSync` só enxerga o status do banco.

Eu consegui reproduzir o cenário exato pelos logs e pelo banco:

- A RunningHub enviou o webhook:
  - `TASK_END` para o `taskId = 2020642609839607810`
  - `status = SUCCESS`
  - com `results[0].url = ...png`
- Logo depois, o webhook loga: **“Job not found”**
- No banco existe o job correspondente:
  - `arcano_cloner_jobs.id = 6cee528c-f0e4-49c3-974d-deb39b771d9e`
  - `task_id = 2020642609839607810`
  - `status = running`
  - `raw_webhook_payload = null` (ou seja: o webhook não conseguiu associar e salvar)

### Causa raiz (o bug de verdade)
O `runninghub-webhook` tenta encontrar o job fazendo um `select(...)` com colunas que **não existem** em `arcano_cloner_jobs` (ex.: `category`, `fallback_attempted`, `input_file_name`, etc.).

Quando ele chega na tabela `arcano_cloner_jobs`, a consulta dá erro (PostgREST/DB), e como o código atual **não trata/loga esse erro direito**, ele só “não encontra” e termina em **Job not found** — mesmo com `task_id` correto.

Resultado: webhook chega, mas a finalização **não ocorre** → job fica eterno em `running` → UI presa.

---

## Objetivo
1) Garantir que **qualquer webhook TASK_END sempre consiga encontrar e finalizar** jobs do Arcano Cloner.  
2) Adicionar um “plano B” para quando webhook falhar: **um endpoint de reconciliação** que consulta o status pelo `taskId` e finaliza o job (para nunca mais ficar preso em processando).  
3) Corrigir os jobs já afetados (incluindo o que você acabou de rodar).

---

## Mudanças propostas (implementação)

### A) Corrigir o `runninghub-webhook` para encontrar Arcano Cloner sempre
**Arquivo:** `supabase/functions/runninghub-webhook/index.ts`

**Estratégia segura: “lookup mínimo + enrich condicional”**
1. No loop das tabelas, buscar o job por `task_id` usando **apenas colunas comuns que existem em todas**:
   - `select('id, started_at, user_credit_cost')`
2. Se a tabela encontrada for `upscaler_jobs`, aí sim fazer um segundo `select` com as colunas específicas do fallback (`category`, `fallback_attempted`, `input_file_name`, etc.).
3. Se uma query der erro, **logar** explicitamente `table + error.message` (pra não ficar “silencioso”).
4. Ao encontrar o job, seguir o fluxo normal:
   - salvar `raw_webhook_payload`
   - chamar `runninghub-queue-manager/finish` para finalizar no banco (e disparar push/thumbnail quando aplicável)

**Resultado:** Arcano Cloner volta a finalizar imediatamente no banco assim que o webhook chegar.

---

### B) Criar um endpoint “Reconciliar job” no Arcano Cloner (escape hatch)
**Arquivo:** `supabase/functions/runninghub-arcano-cloner/index.ts`

Adicionar endpoint: **`/reconcile`** (JWT protegido; o Arcano Cloner já roda com auth do usuário via `functions.invoke`).

Fluxo:
1. Recebe `{ jobId }`
2. Busca em `arcano_cloner_jobs`:
   - `task_id`, `status`, `api_account`, `output_url`, `raw_webhook_payload`
3. Se já estiver `completed/failed/cancelled`, retorna “já finalizado”.
4. Se tiver `task_id`:
   - chama `https://www.runninghub.ai/openapi/v2/query` com o **api key correto**
   - interpreta:
     - `SUCCESS` + `results[0].url` → finaliza via `runninghub-queue-manager/finish` como `completed`
     - `FAILED` → finaliza via `/finish` como `failed` (garante estorno idempotente)
     - `RUNNING/QUEUED` → retorna status atual (sem alterar)
5. **Importante:** incluir suporte a múltiplas chaves (primary + _2…_5) também nessa função, igual o Queue Manager faz, para conseguir consultar task criado com conta alternativa (`api_account`).

**Resultado:** mesmo que a RunningHub falhe em entregar webhook ou a gente tenha algum bug futuro, dá para “puxar o status” e concluir no banco.

---

### C) Adicionar um botão/ação na UI do Arcano Cloner: “Atualizar status agora”
**Arquivo:** `src/pages/ArcanoClonerTool.tsx`

Quando `status === 'processing' || status === 'waiting'` por tempo “demais” (ex.: 60–90s) e `jobId` existe:
- mostrar um botão: **“Atualizar status”**
- ao clicar, chamar:
  - `supabase.functions.invoke('runninghub-arcano-cloner/reconcile', { body: { jobId } })`
- se retornar que concluiu, a UI naturalmente destrava porque o `useJobStatusSync` recebe a mudança do banco (Realtime ou polling).

**Resultado:** o usuário nunca fica “refém” de webhook.

---

### D) Reparar o job que acabou de acontecer (e outros que ficaram presos)
Depois do deploy das correções:
1) Rodar uma reconciliação para jobs recentes presos:
   - buscar `arcano_cloner_jobs` com:
     - `status in ('running','starting','queued')`
     - `task_id is not null`
     - `raw_webhook_payload is null`
     - `started_at < now() - interval '2 minutes'` (para evitar disputar com um job realmente rodando)
2) Para cada um (limitado, ex.: 20), chamar `/reconcile`.

Isso vai corrigir o job preso **sem depender de reenvio de webhook** (porque a RunningHub normalmente não reenviará).

---

## Como vou validar (checklist objetivo)
1) **Repetir um Arcano Cloner do começo ao fim**
   - Confirmar que, no log do webhook, aparece:
     - “Found job in arcano_cloner_jobs: …”
   - Confirmar no banco:
     - `status = completed`
     - `output_url` preenchido
     - `raw_webhook_payload` preenchido
2) **Simular “webhook perdido”**
   - rodar `/reconcile` manualmente (via UI) e verificar que:
     - finaliza no banco
     - UI sai do processando
3) **Verificar que nada quebra o Upscaler fallback**
   - `upscaler_jobs` continua com lógica específica (porque o enrich condicional só roda para ele)

---

## Riscos / cuidados
- A reconciliação consulta a RunningHub; precisamos:
  - limitar frequência (UI: 1 clique por X segundos)
  - logar bem para auditoria
- Manter a finalização central pelo Queue Manager (`/finish`) para:
  - estorno idempotente
  - push notification
  - consistência

---

## Entregáveis (arquivos que serão alterados)
- `supabase/functions/runninghub-webhook/index.ts` (fix do lookup por taskId, sem colunas inexistentes)
- `supabase/functions/runninghub-arcano-cloner/index.ts` (novo endpoint `/reconcile` + suporte a múltiplas keys)
- `src/pages/ArcanoClonerTool.tsx` (botão “Atualizar status”/escape hatch)
- (opcional) pequeno ajuste no Queue Manager apenas se eu decidir centralizar o “scan de presos” lá; mas dá para fazer via `/reconcile` também.

---

## Resultado esperado
- Arcano Cloner **nunca mais fica preso** em “processando” por erro de webhook lookup.
- Se por qualquer motivo o webhook falhar, o usuário tem um **botão de recuperação** que resolve.
- O job que você acabou de rodar e ficou travado será **concluído no banco** via reconciliação (mostrando a imagem na UI).
