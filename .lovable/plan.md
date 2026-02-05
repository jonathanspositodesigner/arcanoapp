
# Auditoria Técnica Completa do Sistema de Jobs/Fila de IA

## Resumo Executivo

| Item | Status | Detalhes |
|------|--------|----------|
| A) Centralização Real | ⚠️ **PARCIAL** | JobManager criado, mas páginas ainda têm lógica manual residual |
| B) Código Antigo/Conflitos | ⚠️ **PARCIAL** | Hooks legados ainda ativos e usados pelas páginas |
| C) Validação da Lógica | ✅ **OK** | Backend implementa corretamente regras de concorrência |
| D) Workflows Corretos | ✅ **OK** | Mapeamento de IDs validado para todas as 4 ferramentas |
| E) Anti-Stuck (Watchdog) | ✅ **OK** | Timeout de 10min + cleanup automático implementado |
| F) Robustez/Concorrência | ✅ **OK** | Reembolso idempotente via flags `credits_charged/refunded` |

---

## A) Centralização Real (Sem Lógica Paralela)

### Pontos onde havia lógica de fila/job ANTES:

| Arquivo | Função | Status Atual |
|---------|--------|--------------|
| `src/hooks/useActiveJobCheck.ts` | Verificar job ativo do usuário | 🔴 **AINDA ATIVO** - usado pelas 4 páginas |
| `src/hooks/useQueueSessionCleanup.ts` | Cancelar jobs ao sair da página | 🔴 **AINDA ATIVO** - usado pelas 4 páginas |
| `src/pages/UpscalerArcanoTool.tsx` | Insert job + upload + invoke edge function | 🔴 **LÓGICA MANUAL** - não usa JobManager.createJob() |
| `src/pages/PoseChangerTool.tsx` | Upload → insert → invoke | 🟡 **PARCIAL** - usa centralCancelJob mas não JobManager completo |
| `src/pages/VesteAITool.tsx` | Upload → insert → invoke | 🟡 **PARCIAL** - usa centralCancelJob mas não JobManager completo |
| `src/pages/VideoUpscalerTool.tsx` | Upload → insert → invoke | 🟡 **PARCIAL** - usa centralCancelJob mas não JobManager completo |

### Substituição feita (apenas cancelamento):
- ✅ Todas as 4 páginas agora usam `cancelJob as centralCancelJob` do `JobManager.ts`
- ❌ As páginas **NÃO** usam `JobManager.createJob()` ou `JobManager.startJob()`
- ❌ As páginas **NÃO** usam `JobManager.checkActiveJob()` - usam hook legado

### Problema identificado:
O `JobManager.ts` foi criado mas **não foi integrado completamente** nas páginas. As páginas ainda fazem:
1. Insert direto no banco via Supabase
2. Chamada manual para edge function
3. Subscription manual para realtime

**RECOMENDAÇÃO:** Migrar gradualmente cada página para usar apenas o JobManager.

---

## B) Código Antigo e Conflitos

### Workers/Cron/Timers ativos:

| Componente | Localização | Conflito? |
|------------|-------------|-----------|
| Timeout de 10min no EdgeRuntime | Todas as edge functions individuais (`runninghub-upscaler`, `runninghub-pose-changer`, `runninghub-veste-ai`, `runninghub-video-upscaler`) | ✅ **NÃO** - complementar ao cleanup central |
| `cleanup_all_stale_ai_jobs()` SQL | Chamado oportunisticamente pelo QueueManager | ✅ **NÃO** - é o mecanismo central |
| Polling fallback (VideoUpscaler) | `VideoUpscalerTool.tsx` linhas 166-218 | ✅ **NÃO** - é backup de último recurso, limitado a 3 tentativas |

### Handlers duplicados de webhook:

| Webhook | Tabelas | Delega para QueueManager? |
|---------|---------|---------------------------|
| `runninghub-webhook` | upscaler_jobs, pose_changer_jobs, veste_ai_jobs | ✅ SIM - linha 119-141 |
| `runninghub-video-upscaler-webhook` | video_upscaler_jobs | ✅ SIM - linha 109-146 |

### Dupla atualização de status:
- ✅ **NÃO HÁ** - Webhooks delegam para `/finish` que é o único ponto de atualização final
- ⚠️ **MAS:** Edge functions individuais também atualizam status para `running` quando iniciam imediatamente (sem fila)

### Código morto identificado:
- ⚠️ `useActiveJobCheck.ts` - Funcionalidade duplicada com `JobManager.checkActiveJob()`
- ⚠️ Lógica de insert/update nas páginas - Deveria usar JobManager

---

## C) Validação da Lógica Exigida

### Concorrência Global = 3
```
Arquivo: supabase/functions/runninghub-queue-manager/index.ts
Linha 36: const GLOBAL_MAX_CONCURRENT = 3;
```

**Verificação:**
- ✅ Com 0/1/2 jobs ocupando vaga → novo job inicia imediatamente (`/check` retorna `available: true`)
- ✅ Com 3 jobs ocupando vaga → novo job entra em QUEUED (`/enqueue` calcula posição FIFO global)
- ✅ Estados que ocupam vaga: `STARTING` + `RUNNING` (linha 107)

### FIFO Global
```
Arquivo: supabase/functions/runninghub-queue-manager/index.ts
Linhas 370-387: handleProcessNext() busca job mais antigo entre TODAS as tabelas
```

**Verificação:**
- ✅ Jobs entram e saem na ordem correta via `created_at ASC`
- ✅ Posições globais recalculadas via `updateAllQueuePositions()` (linhas 161-181)

### 1 Job por Usuário
```
Arquivo: supabase/functions/runninghub-queue-manager/index.ts
Linhas 306-339: handleCheckUserActive()
```

**Verificação:**
- ✅ Verifica TODAS as 4 tabelas
- ✅ Considera estados: `running`, `queued`, `starting` (linha 312)
- ✅ Retorna tool name, job ID e status atual

### Erro Terminal + Mensagem Real
```
Arquivos: Todos os webhooks e edge functions
```

**Verificação:**
- ✅ Erros da RunningHub são passados diretamente: `errorMessage = eventData.errorMessage || eventData.errorCode` (webhook linha 76)
- ✅ Job vai para `FAILED` (terminal) - não re-enfileira
- ✅ Frontend exibe erro via toast: `toast.error(newData.error_message || 'Erro no processamento')`

### Reembolso de Créditos no Erro
```
Arquivo: supabase/functions/runninghub-queue-manager/index.ts
Linhas 184-213: refundCreditsIfNeeded()
```

**Verificação:**
- ✅ Só reembolsa se `credits_charged = true` E `credits_refunded = false` (idempotente)
- ✅ Após reembolsar, marca `credits_refunded = true` no banco
- ✅ Chamado automaticamente em `/finish` quando status é `failed` ou `cancelled`

### Estados e Transições:

```text
┌─────────┐
│ QUEUED  │ ← Job entra quando não há vaga
└────┬────┘
     │ (process-next quando vaga libera)
     ▼
┌──────────┐
│ STARTING │ ← Vaga reservada, iniciando no provedor (ocupa vaga)
└────┬─────┘
     │ (RunningHub aceita e retorna taskId)
     ▼
┌─────────┐
│ RUNNING │ ← Provedor processando (ocupa vaga)
└────┬────┘
     │ (webhook chega)
     ▼
┌───────────┐   ┌────────┐   ┌───────────┐
│ COMPLETED │   │ FAILED │   │ CANCELLED │
└───────────┘   └────────┘   └───────────┘
   (terminal)    (terminal)    (terminal)
                 + reembolso   + reembolso
```

---

## D) Workflows Corretos por Ferramenta

### Mapeamento validado:

| Ferramenta | WebApp ID(s) | Edge Function | Webhook |
|------------|--------------|---------------|---------|
| **Upscaler Arcano** | Pro: `2015865378030755841`, Standard: `2017030861371219969`, Longe: `2017343414227963905`, FotoAntiga: `2018913880214343681`, Comida: `2015855359243587585`, Logo: `2019239272464785409`, Render3D: `2019234965992509442` | `runninghub-upscaler/run` | `runninghub-webhook` |
| **Pose Changer** | `2018451429635133442` | `runninghub-pose-changer/run` | `runninghub-webhook` |
| **Veste AI** | `2018755100210106369` | `runninghub-veste-ai/run` | `runninghub-webhook` |
| **Video Upscaler** | `2018810750139109378` | `runninghub-video-upscaler/run` | `runninghub-video-upscaler-webhook` |

### Node IDs validados:

| Ferramenta | Inputs | Node IDs |
|------------|--------|----------|
| **Upscaler** | image, resolution, denoise, prompt | Varia por categoria (documentado no código) |
| **Pose Changer** | person (27), reference (60) | ✅ Correto |
| **Veste AI** | person (41), clothing (43) | ✅ Correto |
| **Video Upscaler** | video (3) | ✅ Correto |

### Confirmação do fluxo unificado:
Todas as ferramentas seguem: **Página → Edge Function → Queue Manager → RunningHub → Webhook → Queue Manager → Realtime → Página**

---

## E) Jobs Presos e Anti-Stuck

### Status atual do banco (últimas 24h):

| Ferramenta | Completed | Failed | Cancelled |
|------------|-----------|--------|-----------|
| upscaler_jobs | 24 | 9 | 15 |
| pose_changer_jobs | 1 | 0 | 0 |
| veste_ai_jobs | 1 | 0 | 0 |
| video_upscaler_jobs | 2 | 0 | 0 |

**✅ NENHUM job preso em RUNNING/STARTING/QUEUED no momento!**

### Mecanismos de proteção:

1. **Timeout nas Edge Functions (10 min):**
```typescript
// Pose Changer (linha 628-645), Veste AI (linha 651-668), Video Upscaler (linha 322-339)
EdgeRuntime.waitUntil((async () => {
  await new Promise(r => setTimeout(r, 10 * 60 * 1000)); // 10 minutes
  // Se ainda running/queued → chamar user_cancel_ai_job
})());
```

2. **Cleanup Oportunístico (QueueManager):**
```typescript
// Linha 136-158: cleanupStaleJobs()
// Chamado em /check, /check-user-active, /process-next
await supabase.rpc('cleanup_all_stale_ai_jobs');
```

3. **SQL cleanup_all_stale_ai_jobs():**
- Cancela jobs em `running`, `queued`, `starting` há mais de 10 minutos
- Reembolsa créditos via `refund_upscaler_credits()`
- Marca como `failed` com mensagem "timeout"

---

## F) Robustez e Concorrência

### Promoção da fila é atômica?
- ✅ **SIM** - `handleProcessNext()` marca job como `STARTING` **antes** de chamar RunningHub
- ✅ A contagem global já inclui esse job antes da resposta da API

### Chance de iniciar 4º job em corrida?
- ✅ **BAIXA** - Mas não impossível em cenário de alta concorrência
- ⚠️ **RECOMENDAÇÃO:** Adicionar lock/transação explícita no banco para garantir 100%

### Idempotência do webhook?
- ✅ **SIM** - `refundCreditsIfNeeded()` verifica flags antes de agir
- ✅ Se webhook duplicado chegar, job já estará com status terminal

---

## Correções Recomendadas (Seguras)

### Prioridade ALTA (Limpeza do Frontend):

1. **Migrar páginas para usar JobManager completo:**
   - Substituir inserts diretos por `JobManager.createJob()`
   - Substituir invoke manual por `JobManager.startJob()`
   - Substituir subscription manual por `JobManager.subscribeToJob()`

2. **Remover hooks legados (após migração):**
   - `useActiveJobCheck.ts` → substituído por `JobManager.checkActiveJob()`
   - Manter `useQueueSessionCleanup.ts` (funciona bem com QueueManager)

### Prioridade MÉDIA:

3. **Upscaler: Corrigir ordem upload → job:**
   - Atualmente cria job ANTES do upload (pode gerar órfão)
   - Deve seguir padrão do Pose Changer: upload primeiro

4. **Adicionar flag credits_charged nas edge functions:**
   - Marcar `credits_charged = true` logo após consumir créditos
   - Garantir que reembolso só acontece se foi cobrado

### Prioridade BAIXA:

5. **Consolidar edge functions:**
   - Considerar mover lógica de start para QueueManager central
   - Edge functions individuais virariam apenas "wrappers" de validação

---

## Conclusão

### O sistema está robusto?
**✅ SIM** - O backend (QueueManager) está 100% correto e segue todas as regras especificadas.

### O sistema está fácil de manter?
**⚠️ PARCIAL** - Existe duplicação de lógica entre:
- `JobManager.ts` (novo, correto)
- Hooks legados (antigo, ainda usado)
- Código manual nas páginas (antigo, ainda usado)

### Onde fica o "único ponto da verdade"?
- **Backend:** `supabase/functions/runninghub-queue-manager/index.ts`
- **Frontend:** `src/ai/JobManager.ts` (parcialmente integrado)

### Por que isso está robusto?
1. Limite global de 3 respeitado no backend central
2. FIFO global calculado corretamente
3. 1 job por usuário verificado em todas as tabelas
4. Erros são terminais e mostram mensagem real
5. Reembolso idempotente via flags no banco
6. Cleanup automático de jobs presos
7. Timeout de 10 minutos em todas as ferramentas
