
## Objetivo (sem enrolação)
Garantir que **nenhuma** das ferramentas de IA (Upscaler imagem, Upscaler vídeo, Pose Changer, Veste AI) consiga deixar **job fantasma** “queued” preso na fila (bloqueando o usuário), mesmo com:
- app fechando no iPhone/PWA
- queda de rede no meio do upload
- erro/retorno antecipado do backend (ex.: saldo insuficiente, erro de crédito)
- fila cheia (job vai para “queued” de verdade)

---

## O que eu já conferi no código (estado atual)
### 1) Onde os jobs são criados (frontend)
Só existem 4 páginas criando jobs dessas ferramentas:
- `src/pages/UpscalerArcanoTool.tsx`  ✅ cria em `upscaler_jobs`
- `src/pages/VideoUpscalerTool.tsx` ✅ cria em `video_upscaler_jobs`
- `src/pages/PoseChangerTool.tsx` ✅ cria em `pose_changer_jobs`
- `src/pages/VesteAITool.tsx` ✅ cria em `veste_ai_jobs`

### 2) Quem está “seguro” e quem está “vazando job órfão”
- **Veste AI** e **Pose Changer** já estão no padrão correto: **upload primeiro → cria job depois**.
  - Isso já reduz drasticamente órfãos em iOS.
- **Upscaler Arcano (imagem)** e **Video Upscaler (vídeo)** ainda estão no padrão perigoso: **cria job → depois faz upload**.
  - Se o iPhone “mata” o app durante o upload, fica **job queued** sem task/position e o usuário fica bloqueado.

### 3) Falha crítica extra (backend) que também cria “job preso”
Nos backends:
- `runninghub-upscaler`, `runninghub-veste-ai`, `runninghub-pose-changer` têm caminhos de retorno (principalmente **crédito/saldo insuficiente** ou erro no RPC) que **retornam resposta sem marcar o job como failed/cancelled**.
  - Resultado: job fica “queued” e bloqueia o usuário.
- O `runninghub-video-upscaler` já marca `failed` em insuficiência de créditos (ponto positivo).

### 4) Outra falha importante (vídeo + fila cheia)
Hoje o `VideoUpscalerTool.tsx` salva `input_file_name: videoFile.name` no job.
- Só que **quando o job entra na fila**, o orquestrador (fila global) e também o processador do vídeo esperam usar `input_file_name` como **URL do vídeo** para rodar depois.
- Se ficar só o “nome do arquivo”, job enfileirado pode falhar/ficar inconsistente.

### 5) Situação do banco agora (auditoria rápida)
Rodei uma consulta procurando “órfãos clássicos” (queued + sem task_id/started_at/position, >10 min) nas 4 tabelas e, neste momento, estava **zerado**.
Isso não elimina o bug: significa só que **agora** não tem órfão antigo, mas o código ainda permite criar.

---

## Correções propostas (em camadas, cobrindo todas as ferramentas)

### Camada A — “Blindagem” definitiva no frontend (onde hoje ainda vaza)
#### A1) Upscaler Arcano (imagem): “upload primeiro, job depois” + status correto de fila
Arquivo: `src/pages/UpscalerArcanoTool.tsx`

Mudanças:
1) Gerar `jobId = crypto.randomUUID()` antes de qualquer coisa.
2) Fazer upload para storage usando `jobId` no path:
   - Ex.: `upscaler/${jobId}.${ext}`
3) **Só depois** do upload OK, inserir na tabela:
   - `id: jobId`
   - `session_id`, `user_id`, `status: 'queued'`, parâmetros etc.
4) Invocar `runninghub-upscaler/run` passando `jobId` e `imageUrl`.
5) Se der erro **depois** de criar job (ex.: falha no invoke), atualizar a linha do job para `failed`/`cancelled` com `completed_at` e `error_message`.

Ajuste adicional obrigatório:
- Hoje o hook `useQueueSessionCleanup(sessionId, status)` só cancela se `status === 'queued' || 'waiting'`.
- No Upscaler imagem, quando o job entra em `queued` pelo realtime, você só seta `isWaitingInQueue`, mas **não muda `status`**.
- Vou alinhar isso:
  - adicionar `'waiting'` ao `ProcessingStatus`
  - quando receber `job.status === 'queued'` no realtime, fazer `setStatus('waiting')`
  - isso garante que o cleanup funcione quando o usuário fecha o app enquanto está na fila.

#### A2) Video Upscaler: “upload primeiro, job depois” + salvar URL no campo certo
Arquivo: `src/pages/VideoUpscalerTool.tsx`

Mudanças:
1) Gerar `jobId` antes.
2) Upload do vídeo primeiro → obter `videoStorageUrl`.
3) Inserir job depois do upload, com:
   - `id: jobId`
   - `input_file_name: videoStorageUrl` (sim, o nome do campo é ruim, mas é o que existe e é o que a fila usa)
   - metadados (width/height/duration), `session_id`, `user_id`, `status: 'queued'`
4) Chamar `runninghub-video-upscaler/run` com `jobId` e `videoUrl: videoStorageUrl`.
5) Em erro pós-insert, marcar job como `failed/cancelled`.

Impacto:
- Se o app morrer durante upload: **não existe job no banco ainda**, logo **não trava ninguém**.
- Se entrar em fila global: quando for processar depois, o backend terá a URL correta.

---

### Camada B — “Não deixar job queued preso por retorno antecipado” no backend (todas as ferramentas)
Aqui a regra vai ser: **qualquer erro/retorno antecipado precisa finalizar o job no banco**.

#### B1) Upscaler (imagem)
Arquivo: `supabase/functions/runninghub-upscaler/index.ts`

Mudanças:
1) Se der erro no processamento de créditos (`creditError`) → atualizar `upscaler_jobs`:
   - `status='failed'`, `error_message='CREDIT_ERROR: ...'`, `completed_at=now()`
2) Se `INSUFFICIENT_CREDITS` → atualizar job também:
   - `status='failed'`, `error_message='INSUFFICIENT_CREDITS: ...'`, `completed_at=now()`
3) Hardening para evitar “crédito consumido mas job ainda parece órfão”:
   - assim que o consumo de crédito der sucesso, fazer **um update imediato**:
     - `user_credit_cost = creditCost`
   - isso ajuda a:
     - impedir auto-clean “errado” em job que já consumiu
     - permitir refund se o usuário cancelar enquanto queued

#### B2) Veste AI
Arquivo: `supabase/functions/runninghub-veste-ai/index.ts`

Mudanças:
- Mesmo padrão do Upscaler:
  - se crédito falhar → `veste_ai_jobs.status='failed'` + `completed_at`
  - se insuficiente → idem
- (Opcional) após sucesso no crédito: setar `user_credit_cost = creditCost` cedo, para suportar refund em cancelamento.

#### B3) Pose Changer
Arquivo: `supabase/functions/runninghub-pose-changer/index.ts`

Mudanças idênticas às do Veste AI (finalizar job em qualquer retorno antecipado de crédito).

#### B4) Video Upscaler (backend)
Arquivo: `supabase/functions/runninghub-video-upscaler/index.ts`

Mesmo já tratando insuficiente com `failed`, ainda falta hardening:
- garantir que, ao entrar no `/run`, o job tenha o `input_file_name` correto (URL) caso algum cliente antigo ainda insira “nome do arquivo”.
  - atualização defensiva: se `input_file_name` não parece URL e veio `videoUrl` no body, setar `input_file_name = videoUrl` antes de enfileirar.

---

### Camada C — Robustez extra no “check-user-active” (evitar edge cases)
Arquivo: `supabase/functions/runninghub-queue-manager/index.ts`

Hoje já existe auto-heal com:
- queued + sem task_id/started_at/position + waited_in_queue false + credit_cost 0/null + idade > 2 min → cancela

Melhorias que eu vou aplicar para não ter “falso negativo”:
1) Tornar a busca determinística:
   - buscar **primeiro** jobs `running`
   - depois jobs `queued` (e aí aplicar auto-heal)
   - isso evita o caso raro: usuário ter 2 registros (um running real + um queued órfão) e o `limit(1)` pegar o órfão e “pular” o running.
2) Se encontrar um órfão e cancelar, **re-checar a mesma tabela** antes de seguir, garantindo que não existe um running real ali.

---

## Plano de testes (para provar que não cria órfão e não trava fila)
### Testes manuais (principalmente iPhone/PWA)
1) **Upscaler imagem**
   - iniciar upscale
   - durante upload, matar o app (multitarefa → fechar)
   - voltar e tentar de novo
   - esperado: não existe job queued “fantasma” (porque job só nasce após upload)
2) **Video Upscaler**
   - simular fila cheia (3 jobs rodando)
   - iniciar vídeo
   - esperado:
     - job entra em queued com posição
     - quando processar depois, ele roda usando a URL correta (input_file_name = URL)
3) **Saldo insuficiente / falha de crédito**
   - forçar cenário com poucos créditos
   - iniciar ferramenta
   - esperado:
     - backend devolve erro e **job fica failed**, não queued
     - usuário não fica bloqueado na próxima tentativa
4) **Cancelar fila**
   - entrar em queued (fila real)
   - sair da página
   - esperado:
     - cancel-session cancela + reordena fila
     - se tiver `user_credit_cost`, créditos voltam

### Auditoria pós-publicação (monitoramento)
Rodar (internamente) queries de:
- queued antigos sem task/position
- queued com input_file_name inválido (vídeo)
- contagem por tabela e idade média

---

## Arquivos que serão alterados (resumo)
Frontend:
- `src/pages/UpscalerArcanoTool.tsx` (mudar ordem: upload → insert; status waiting)
- `src/pages/VideoUpscalerTool.tsx` (upload → insert; input_file_name = URL)

Backend (funções):
- `supabase/functions/runninghub-upscaler/index.ts` (finalizar job em erro de crédito; setar user_credit_cost cedo)
- `supabase/functions/runninghub-veste-ai/index.ts` (finalizar job em erro de crédito)
- `supabase/functions/runninghub-pose-changer/index.ts` (finalizar job em erro de crédito)
- `supabase/functions/runninghub-video-upscaler/index.ts` (hardening de input_file_name/URL)
- `supabase/functions/runninghub-queue-manager/index.ts` (refinar check-user-active para não “pular running real”)

---

## Resultado esperado (o que muda na prática)
- Fechou o app no iPhone durante upload: **não cria job no banco** → **não trava fila**.
- Se backend negar crédito/der erro: job vira **failed** (com completed_at) → **não bloqueia o usuário**.
- Vídeo enfileirado (fila cheia) passa a ter **URL persistida** → fila global consegue processar corretamente depois.
- Mesmo que um “órfão” apareça por alguma condição extrema, o sistema tem:
  - auto-heal do check-user-active
  - cancel-session + refund quando aplicável
  - estados de UI alinhados para cleanup funcionar (incluindo Upscaler imagem)

---