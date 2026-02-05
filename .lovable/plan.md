
## Diagnóstico (o que está acontecendo de verdade)

O bloqueio “você já tem um trabalho em andamento / dois ao mesmo tempo” vem do endpoint **`runninghub-queue-manager/check-user-active`**, que simplesmente procura no banco qualquer job do usuário com `status IN ('queued','running')`.

No caso desse usuário, eu já encontrei no banco um job **preso**:

- Tabela: `upscaler_jobs`
- `status`: `queued`
- `task_id`: `null`
- `started_at`: `null`
- `position`: `null`
- `waited_in_queue`: `false`
- Id do job: `6b56dbb4-328d-460e-8aa1-4aaa8146641b`
- Criado há horas (ou seja: não é fila “de verdade”, é job órfão)

Isso é exatamente o “fantasma” que faz o sistema achar que ele já está em job ativo.

### Por que esse job órfão aparece
No **Upscaler Arcano** (e também no **VideoUpscaler**) o fluxo atual cria o job no banco **antes** do upload e **antes** da chamada do backend. Se qualquer coisa falhar depois (upload, invoke, rede, iOS suspendendo o app), o job fica `queued` para sempre.

E pior: o hook `useQueueSessionCleanup(sessionId, status)` só cancela se o status da UI for `'queued'` ou `'waiting'`, mas no `UpscalerArcanoTool` o status da UI é `'uploading'|'processing'|'error'...` (não existe `'waiting'`), então o cleanup quase nunca dispara.

Resultado: job fica “pendurado” e bloqueia o usuário indefinidamente.

---

## Objetivo da correção
1) **Destravar usuários automaticamente** quando existir job órfão “fake queued”.
2) **Impedir que novos jobs órfãos sejam criados** no Upscaler/VideoUpscaler.
3) Dar uma saída fácil no UI (“Liberar fila / Cancelar job preso”) quando o bloqueio ocorrer.

---

## Entrega em 3 camadas (robusta)

### Camada A — “Auto-cura” no backend do gerenciador de fila (resolve o problema para todos)
Alterar `supabase/functions/runninghub-queue-manager/index.ts` em `handleCheckUserActive` para:

1. Buscar (por tabela) não só `id, status`, mas também:
   - `created_at, started_at, task_id, position, waited_in_queue, user_credit_cost`
2. Se encontrar `status='queued'` **e** o job tiver perfil de “órfão”:
   - `task_id IS NULL`
   - `started_at IS NULL`
   - `position IS NULL`
   - `waited_in_queue = false`
   - `user_credit_cost` é `0`/`null` (garantia de que não cobrou crédito)
   - `created_at < now() - intervalo` (ex.: 2–5 minutos)
3. Então **auto-cancelar** esse job (update):
   - `status='cancelled'`
   - `error_message='Auto-clean: orphan queued job (client failed before enqueue/run)'`
   - `completed_at=now()`
4. Continuar o loop (como se não tivesse job ativo) e só bloquear se achar um job ativo “de verdade”.

Com isso, mesmo que o usuário tenha um job fantasma, o próprio “check de bloqueio” vai limpar e liberar.

**Por que é seguro**: esse tipo de órfão é justamente o job que nunca começou (sem task_id, sem started_at, sem posição de fila) e sem crédito consumido.

---

### Camada B — Botão de “Liberar agora” no modal (saída manual pro usuário)
Atualizar o fluxo de bloqueio para permitir que o usuário destrave sem precisar chamar você:

1. Expandir o retorno de `check-user-active` para incluir:
   - `activeTable` (ex.: `upscaler_jobs`)
   - `activeStatus`
   - `activeJobId`
   - `createdAt` (opcional, mas ajuda)
2. Atualizar as páginas (`UpscalerArcanoTool`, `PoseChangerTool`, `VesteAITool`, `VideoUpscalerTool`) para guardar também `activeJobId/activeStatus`.
3. Atualizar `ActiveJobBlockModal`:
   - Se `activeStatus === 'queued'`, exibir botão **“Liberar fila”**.
   - Ao clicar, chamar o endpoint já existente:
     - `POST /runninghub-queue-manager/cancel-session` com `{ userId }`
   - Fechar modal e permitir tentar novamente.

Observação: `cancel-session` hoje cancela **queued** (não running). Isso é perfeito para o caso típico de “job fantasma”.

---

### Camada C — Corrigir a causa raiz no frontend (parar de criar job órfão)
#### 1) Upscaler Arcano: upload primeiro, job depois
Refatorar `src/pages/UpscalerArcanoTool.tsx` para o fluxo:

1. Gerar um `jobId` no cliente: `crypto.randomUUID()`
2. Fazer upload para storage usando esse `jobId` (ex.: `upscaler/${jobId}.${ext}`)
3. Só depois do upload OK:
   - inserir na tabela `upscaler_jobs` com `id: jobId`, `session_id`, `user_id`, etc.
4. Chamar `runninghub-upscaler/run` com `jobId` + `imageUrl`.

Isso elimina 99% dos “queued órfãos”.

#### 2) VideoUpscaler: mesmo princípio
Em `src/pages/VideoUpscalerTool.tsx`, trocar para:
1. Upload do vídeo primeiro
2. Criar o job no banco depois do upload
3. Invocar `runninghub-video-upscaler/run`

#### 3) Se der erro depois de criar job, finalizar job no banco
Mesmo com o fluxo corrigido, ainda pode falhar depois de inserir (por exemplo, falha no invoke). Então:
- Em `catch`, se existir `jobId`, fazer update no job:
  - `status='failed'` ou `cancelled'`
  - `error_message` com motivo
  - `completed_at=now()`

---

## Correção adicional (importante): `useQueueSessionCleanup` no Upscaler Arcano
Hoje o `useQueueSessionCleanup(sessionId, status)` não funciona direito no Upscaler porque `status` nunca é `'queued'`/`'waiting'`.

Vou ajustar a chamada (ou o próprio hook) para considerar estados como `uploading` como “em risco de órfão” quando já existe job pendente, por exemplo:

- Passar para o hook um status “compatível”:
  - quando `status === 'uploading'` ou existe um `jobId` sem conclusão, tratar como `'queued'` para fins de cleanup
- Alternativa melhor (mais correta): mudar a assinatura do hook para receber um boolean `shouldCancelOnLeave` ao invés de string.

---

## Passo imediato (para esse usuário específico)
Assim que eu implementar as mudanças acima:
- o `check-user-active` vai **auto-cancelar** esse job órfão e o usuário volta a conseguir usar na hora.

Se você quiser “destravar agora” sem esperar, a solução técnica é chamar o endpoint existente:
- `runninghub-queue-manager/cancel-session` com `{ userId }`
Mas eu só vou executar isso quando estivermos no modo de implementação (fora deste modo de leitura).

---

## Testes (pra garantir que não volta)
1) Reproduzir erro forçando falha no meio (ex.: desligar rede depois do “criar job” / durante upload) e confirmar que:
   - não fica job `queued` sem `position/task_id/started_at`
2) Confirmar que o modal de bloqueio agora oferece **“Liberar fila”** quando for `queued`.
3) Confirmar que jobs em fila real (com `position` e `waited_in_queue=true`) continuam bloqueando corretamente (comportamento desejado).
4) Validar em iPhone PWA: fechar app no multitarefa durante upload e confirmar que não deixa “fantasma”.

---

## Arquivos que vou mexer (quando você aprovar a implementação)
- `supabase/functions/runninghub-queue-manager/index.ts` (auto-cura + retornar mais info do job)
- `src/hooks/useActiveJobCheck.ts` (tipos/retorno com mais campos)
- `src/components/ai-tools/ActiveJobBlockModal.tsx` (botão “Liberar fila”)
- `src/pages/UpscalerArcanoTool.tsx` (upload antes, job depois + cleanup em catch)
- `src/pages/VideoUpscalerTool.tsx` (upload antes, job depois + cleanup em catch)
- (opcional) `src/hooks/useQueueSessionCleanup.ts` ou ajuste da forma como ele é chamado no Upscaler

