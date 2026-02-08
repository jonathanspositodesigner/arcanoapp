
## Objetivo (bug de estorno)
Garantir que, quando o provedor retornar erro de **falha ao iniciar** (ex.: `工作流运行失败` / “Failed to start workflow”) — ou seja, quando **não existe `task_id`** porque o processamento nem começou — o usuário seja **reembolsado automaticamente** (sem depender de webhook).

Além disso, vou **reembolsar manualmente** o que já ficou pendente para o usuário `vinnynunesrio@gmail.com` e corrigir inconsistências de flags em jobs cancelados por admin.

---

## O que eu investiguei (evidência no banco)
### 1) O caso do Vinny (não estornado)
- Usuário: `vinnynunesrio@gmail.com` (id `858e37be-...`)
- Existe um job **cancelled** com crédito cobrado e não reembolsado:
  - Job: `fa49805e-c52c-461e-9c8d-78bf5542c433`
  - `credits_charged=true`, `credits_refunded=false`, `user_credit_cost=60`
  - `task_id` existe, mas **não existe webhook salvo** e `rh_cost=0`
  - Mensagem atual: “Créditos não devolvidos (processamento já iniciado).”

Você pediu que, quando o erro for “RunningHub nem iniciou / `工作流运行失败`”, sempre reembolse. Para esse job específico, como não houve retorno do provedor e ficou sem estorno, vou **reembolsar manualmente** e marcar o job como reembolsado para evitar estorno duplicado no futuro.

### 2) Existe bug real de “falhou ao iniciar” sem estorno (afetando outros também)
Encontrei **3 jobs** em `upscaler_jobs` com:
- `status='failed'`
- `task_id IS NULL`
- `credits_charged=true`
- `credits_refunded=false`

Eles são do e-mail `breehmartins10@gmail.com` (jobs `9be1f8e0...`, `2291bfdd...`, `403c27b9...`), ou seja: esse bug já está afetando clientes (não é só o Vinny).

### 3) Bug de flag em cancelamento admin (não é falta de estorno, é flag inconsistente)
Encontrei:
- Job `6b46e502-727e-4160-950b-7cf912d6201b` (jonathan.lifecazy@gmail.com)
- Há transação de refund +80 no extrato, mas o job está `credits_refunded=false`.
Causa provável: a função de backend `admin_cancel_job` estorna, mas **não seta `credits_refunded=true`** na linha do job.

---

## Causa raiz (por que acontece)
Nos fluxos que chamam o provedor diretamente pela função de backend (ex.: `runninghub-upscaler/run`), os créditos são consumidos primeiro (`consume_upscaler_credits`) e marcamos `credits_charged=true`.

Quando o provedor responde com erro **antes de gerar `task_id`** (ex.: `工作流运行失败` no start), **não existe webhook depois** e o sistema não passa pelo “finalizador” central (`/finish`), então:
- o job fica como `failed`
- os créditos ficam como “consumidos”
- e **ninguém reembolsa**, porque não houve evento de término.

Isso também existe nos outros módulos (`runninghub-pose-changer`, `runninghub-veste-ai`, `runninghub-arcano-cloner`), que têm o mesmo padrão: cobram, tentam iniciar, e se falhar não reembolsam.

---

## Correção técnica (o que vou mudar)

### A) Hotfix: Reembolso automático em falha ao iniciar (sem `task_id`)
Vou atualizar as funções de backend para que, se houver erro **antes do `task_id`**, elas:
1) chamem `refund_upscaler_credits(user_id, amount, description)`
2) atualizem o job com `credits_refunded=true`
3) registrem um `error_message` explícito, por ex.:
   - `START_FAILED_REFUNDED: 工作流运行失败`
   - ou `START_FAILED_REFUNDED: Failed to start workflow`

Arquivos afetados:
- `supabase/functions/runninghub-upscaler/index.ts` (principal)
- `supabase/functions/runninghub-pose-changer/index.ts`
- `supabase/functions/runninghub-veste-ai/index.ts`
- `supabase/functions/runninghub-arcano-cloner/index.ts`

Detalhes importantes de implementação:
- Reembolso **idempotente**:
  - só reembolsar se `credits_charged=true` e `credits_refunded != true` e `user_credit_cost > 0`
- Tratar estes cenários como “não iniciou”:
  - resposta do provedor sem `taskId` (ou `data?.data?.taskId`, dependendo do formato)
  - exceção de rede / HTML / parse / 4xx/5xx no start
- Ajuste de parsing (evitar falso “sem taskId”):
  - reconhecer ambos formatos:
    - `data.taskId`
    - `data.data?.taskId`
  - e reconhecer erro via `data.code !== 0` quando esse formato vier assim.

Resultado: sempre que aparecer `工作流运行失败` na **resposta de start**, o usuário será reembolsado na hora.

---

### B) Corrigir `admin_cancel_job` para marcar `credits_refunded=true` quando estornar
Vou atualizar a função do banco `admin_cancel_job` para:
- manter o estorno como está
- e também setar `credits_refunded=true` no job correspondente (além de `status='cancelled'`)

Isso evita o problema “estornou, mas no histórico aparece como não estornado”.

Arquivo/entrega:
- uma migration SQL em `supabase/migrations/...sql` com `CREATE OR REPLACE FUNCTION public.admin_cancel_job(...)`

---

### C) Reparos manuais (backfill) — estornar quem ficou para trás
Vou incluir uma migration que faz 3 reparos:

1) **Reembolso manual do Vinny** (o que você pediu):
- Job `fa49805e-c52c-461e-9c8d-78bf5542c433`
- Se ainda estiver `credits_refunded=false`:
  - executar `refund_upscaler_credits( user_id, 60, 'Estorno manual: falha RunningHub (sem conclusão)')`
  - `UPDATE upscaler_jobs SET credits_refunded=true, error_message='... (estornado manualmente)' WHERE id=...;`

2) **Reembolso automático retroativo** para todos `upscaler_jobs` que:
- `status='failed'`
- `task_id IS NULL`
- `credits_charged=true`
- `credits_refunded=false`
Isso cobre os 3 jobs da `breehmartins10@gmail.com` e qualquer outro caso igual que existir.

3) **Correção de flag** para o job do admin que já foi reembolsado:
- `UPDATE upscaler_jobs SET credits_refunded=true WHERE id='6b46e502-...';`
(sem criar novo refund, porque já existe transação de +80 no extrato)

---

## Como vou validar (checagens objetivas)
### 1) Garantir que não sobra “falhou sem taskId e sem estorno”
Rodar contagem antes/depois:
- `upscaler_jobs where status='failed' and task_id is null and credits_charged=true and credits_refunded=false` deve virar **0**.

### 2) Caso `工作流运行失败` (start failure)
Forçar um start failure (ex.: workflow problemático) e verificar:
- job termina `failed`
- `credits_refunded=true`
- saldo do usuário aumenta de volta
- `error_message` deixa claro que foi reembolsado

### 3) Conferir o Vinny
Após a migration:
- `fa49805e...` deve ficar `credits_refunded=true`
- extrato deve ter um refund +60 (descrição de estorno manual)
- saldo do Vinny deve subir +60

---

## Riscos / cuidados
- Evitar estorno duplicado:
  - todas as rotinas (função e migration) vão checar `credits_refunded` antes de reembolsar
- Evitar “marcar como reembolsado” sem realmente reembolsar:
  - nos casos em que vamos mudar só flag (admin), só farei isso quando houver evidência clara no extrato (já conferi no caso do job `6b46e...`).

---

## Entregáveis (o que será alterado)
1) Código (funções de backend):
- `supabase/functions/runninghub-upscaler/index.ts`
- `supabase/functions/runninghub-pose-changer/index.ts`
- `supabase/functions/runninghub-veste-ai/index.ts`
- `supabase/functions/runninghub-arcano-cloner/index.ts`

2) Banco (migration):
- Atualizar `public.admin_cancel_job(...)`
- Rodar backfill/estornos manuais (Vinny + casos `failed` sem `task_id`)

---

## Resultado esperado
- Sempre que o provedor responder `工作流运行失败` no início (sem `task_id`), o usuário será reembolsado automaticamente.
- O Vinny terá os créditos dos fails pendentes reembolsados (incluindo o job citado).
- O painel/admin e auditoria passam a mostrar `credits_refunded` consistente com o que realmente aconteceu.
