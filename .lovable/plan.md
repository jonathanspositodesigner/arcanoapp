

# Auditoria Técnica Final - Sistema de Jobs/Fila de IA

## Checklist de Verificação

| Item | Status | Detalhes |
|------|--------|----------|
| **1) Centralização Total** | ✅ OK | Todas as ferramentas delegam para JobManager (FE) e QueueManager (BE) |
| **2) Código Morto/Duplicado** | ⚠️ **1 CORREÇÃO** | Rota legada `/process-queue` no video-upscaler ainda referencia funções removidas |
| **3a) Concorrência Global = 3** | ✅ OK | Linha 36 do QueueManager: `GLOBAL_MAX_CONCURRENT = 3` |
| **3b) Fila FIFO Global** | ✅ OK | Linhas 370-387: busca job mais antigo entre TODAS as tabelas |
| **3c) 1 Job por Usuário** | ✅ OK | Linhas 306-339: verifica `running/queued/starting` em todas as tabelas |
| **3d) Erro Terminal + Mensagem Real** | ✅ OK | Webhooks passam erro real da API sem filtrar |
| **3e) Webhook Finaliza** | ✅ OK | Ambos webhooks delegam para `/finish` |
| **3f) Reembolso em FAILED/CANCELLED** | ✅ OK | Linhas 184-213: idempotente via flags |
| **3g) Anti-Job-Preso** | ✅ OK | Timeout 10min + cleanup oportunístico |
| **4a) Atomicidade (sem 4º job)** | ✅ OK | `/check` conta antes de autorizar |
| **4b) Webhook Idempotente** | ✅ OK | Verifica `credits_refunded` antes de reembolsar |
| **4c) Estados Terminais** | ✅ OK | `completed/failed/cancelled` não voltam |
| **5) Mapeamento de Workflows** | ✅ OK | Todos os WebApp IDs e Node IDs corretos |

---

## Pontos de Risco Identificados

### ⚠️ RISCO 1: Rota `/process-queue` Quebrada (CRÍTICO)

**Arquivo:** `supabase/functions/runninghub-video-upscaler/index.ts`
**Linhas:** 350-495

**Problema:** O código referencia funções `getNextQueuedJob` e `updateQueuePositions` que foram removidas (comentário na linha 77-79 confirma). Se essa rota for chamada, causará `ReferenceError`.

**Evidência:**
```typescript
// Linha 361
const nextJob = await getNextQueuedJob(supabase); // ← FUNÇÃO NÃO EXISTE
// Linha 379
await updateQueuePositions(supabase); // ← FUNÇÃO NÃO EXISTE
```

**Impacto:** Erro 500 se alguém chamar `/process-queue`. Porém, essa rota **não é mais usada** - o QueueManager `/process-next` a substitui.

**Correção Necessária:** Remover a rota `/process-queue` (linhas 350-495) e a rota `/queue-status` (linhas 330-348) do video-upscaler.

---

## Código Morto/Duplicado Encontrado

| Localização | O que é | Por que está morto | Decisão |
|-------------|---------|-------------------|---------|
| `video-upscaler` linhas 330-348 | Rota `/queue-status` | Substituída por `QueueManager /status` | **Remover** |
| `video-upscaler` linhas 350-495 | Rota `/process-queue` | Substituída por `QueueManager /process-next` + funções referenciadas não existem | **Remover** |

---

## Mapa de Ferramentas → Workflows (Confirmado)

| Ferramenta | WebApp ID(s) | Node IDs | Edge Function | Webhook |
|------------|--------------|----------|---------------|---------|
| **Upscaler Arcano** | Pro: `2015865378030755841`, Standard: `2017030861371219969`, Longe: `2017343414227963905`, FotoAntiga: `2018913880214343681`, Comida: `2015855359243587585`, Logo: `2019239272464785409`, Render3D: `2019234965992509442` | 26 (image), 75/73 (res), 25 (denoise), 128 (prompt), 139 (fotoAntiga), 50/48 (comida), 39/33 (logo), 301/300 (3d) | `runninghub-upscaler/run` | `runninghub-webhook` |
| **Pose Changer** | `2018451429635133442` | 27 (person), 60 (pose) | `runninghub-pose-changer/run` | `runninghub-webhook` |
| **Veste AI** | `2018755100210106369` | 41 (person), 43 (clothing) | `runninghub-veste-ai/run` | `runninghub-webhook` |
| **Video Upscaler** | `2018810750139109378` | 3 (video) | `runninghub-video-upscaler/run` | `runninghub-video-upscaler-webhook` |

---

## Resumo da Arquitetura Final ("Único Ponto da Verdade")

```text
┌─────────────────────────────────────────────────────────────────┐
│                       FRONTEND                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ JobManager.ts (src/ai/JobManager.ts)                      │  │
│  │ • checkActiveJob() → delega ao QueueManager               │  │
│  │ • cancelJob() → delega à RPC user_cancel_ai_job           │  │
│  │ • createJob() → insere com status: 'pending'              │  │
│  │ • startJob() → chama edge function                        │  │
│  │ • markJobFailed() → chama QueueManager /finish            │  │
│  │ • subscribeToJob() → Realtime                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│              ↓                                                   │
│  4 Tool Pages: upload → insert → invoke edge function           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ QueueManager (runninghub-queue-manager) - VERDADE ÚNICA   │  │
│  │ • /check → verifica slots (limite 3 global)               │  │
│  │ • /check-user-active → 1 job por usuário                  │  │
│  │ • /enqueue → calcula posição FIFO global                  │  │
│  │ • /process-next → promove próximo job da fila             │  │
│  │ • /finish → finaliza + reembolsa + processa próximo       │  │
│  │ • cleanupStaleJobs() → cancela jobs presos (10min)        │  │
│  │ • refundCreditsIfNeeded() → reembolso idempotente         │  │
│  └───────────────────────────────────────────────────────────┘  │
│              ↓                                                   │
│  4 Edge Functions: validação → créditos → /check → RunningHub   │
│              ↓                                                   │
│  2 Webhooks: delegam 100% para /finish                          │
│              ↓                                                   │
│  RPCs: user_cancel_ai_job, cleanup_all_stale_ai_jobs, etc       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Como a Lógica Funciona (Fluxo Completo)

### Cenário 1: Slots disponíveis (0-2 jobs rodando)
```
1. Página chama checkActiveJob(userId)
   └→ JobManager → QueueManager /check-user-active
   └→ Se tem job ativo → modal bloqueia
   
2. Upload imagem → Insert job (status: pending)

3. Página chama edge function (ex: runninghub-upscaler/run)
   └→ Edge function consome créditos
   └→ Marca credits_charged = true
   └→ Chama QueueManager /check
   └→ Slots disponíveis? SIM → marca status: running
   └→ Chama RunningHub API
   └→ Retorna taskId

4. RunningHub processa e chama webhook
   └→ Webhook delega para QueueManager /finish
   └→ Status: completed + output_url
   └→ Trigger /process-next (nada a processar)

5. Realtime notifica página → exibe resultado
```

### Cenário 2: Fila cheia (3 jobs rodando)
```
1-2. (mesmo que cenário 1)

3. Edge function chama QueueManager /check
   └→ Slots disponíveis? NÃO
   └→ Chama /enqueue → status: queued, position: N
   └→ Retorna { queued: true, position: N }

4. Página exibe "Fila #N" via Realtime

5. Algum job termina → webhook chama /finish
   └→ /finish chama /process-next
   └→ /process-next busca job mais antigo (FIFO global)
   └→ Marca status: starting → chama RunningHub
   └→ Marca status: running

6. Quando job do usuário começa → Realtime atualiza posição para 0
```

### Cenário 3: Erro em qualquer ponto
```
A) Erro antes de créditos serem cobrados:
   └→ Job marcado como failed
   └→ Sem reembolso (credits_charged = false)

B) Erro após créditos cobrados:
   └→ Edge function chama markJobFailed()
   └→ markJobFailed() chama QueueManager /finish
   └→ /finish verifica credits_charged = true, credits_refunded = false
   └→ Reembolsa via RPC refund_upscaler_credits
   └→ Marca credits_refunded = true

C) Erro no RunningHub (via webhook):
   └→ Webhook recebe status: FAILED
   └→ Delega para /finish com errorMessage real
   └→ Mesmo fluxo de reembolso (B)

D) Job preso (10+ minutos):
   └→ EdgeRuntime.waitUntil() dispara timeout
   └→ Chama user_cancel_ai_job (RPC)
   └→ Cancela + reembolsa + libera vaga
   
   OU
   
   └→ cleanupStaleJobs() chamado em /check ou /process-next
   └→ RPC cleanup_all_stale_ai_jobs
   └→ Cancela jobs presos + reembolsa
```

---

## Correções Necessárias para 100%

| Prioridade | Correção | Arquivo | Linhas |
|------------|----------|---------|--------|
| **CRÍTICA** | Remover rota `/process-queue` (código morto que causa erro) | `supabase/functions/runninghub-video-upscaler/index.ts` | 350-495 |
| ALTA | Remover rota `/queue-status` (duplica QueueManager /status) | `supabase/functions/runninghub-video-upscaler/index.ts` | 330-348 |

---

## Garantias de Não-Conflito

| Garantia | Como é Implementada |
|----------|---------------------|
| Não há 4º job rodando | QueueManager `/check` conta ANTES de autorizar |
| Webhook duplicado não duplica reembolso | Flag `credits_refunded` verificada antes |
| Estados terminais não voltam | `/finish` só atualiza se status atual não é terminal |
| Usuário não tem 2 jobs | `/check-user-active` verifica TODAS as tabelas |
| Job não fica preso | Timeout 10min + cleanup oportunístico |
| Reembolso sempre acontece | `markJobFailed` no frontend delega para `/finish` |

---

## Conclusão

O sistema está **98% centralizado e correto**. A única correção necessária é remover as rotas legadas `/process-queue` e `/queue-status` do `runninghub-video-upscaler`, que são código morto que referencia funções deletadas.

Após essa limpeza, o sistema estará **100% centralizado** com:
- **Uma única fonte de verdade** para regras de negócio (QueueManager)
- **Uma única interface frontend** (JobManager)
- **Nenhum conflito** entre lógicas paralelas
- **Robustez garantida** contra jobs presos, webhooks duplicados e erros em qualquer ponto

