# Plano: Arquitetura Multi-API RunningHub Escalável (2-N Contas)

## ✅ STATUS: IMPLEMENTADO

A arquitetura multi-API foi implementada e está pronta para uso. O sistema atualmente funciona com 1 conta (comportamento atual) e suportará automaticamente 2-5 contas quando as secrets forem adicionadas.

---

## Sobre Webhooks

**Não precisa de webhooks separados!** O mesmo webhook funciona para todas as contas porque:

1. O RunningHub envia o callback com o `taskId` do job
2. O webhook busca o job pelo `taskId` no banco de dados
3. Não importa de qual conta veio - o `taskId` é único

---

## Arquitetura Implementada

### Conceito de "API Pool"

```text
┌───────────────────────────────────────────────────────────────────┐
│                     API POOL (Configurável)                        │
├───────────────────────────────────────────────────────────────────┤
│  Conta 1: RUNNINGHUB_API_KEY     → 3 slots  ✓ (ativa)              │
│  Conta 2: RUNNINGHUB_API_KEY_2   → 3 slots  ○ (adicionar secret)   │
│  Conta 3: RUNNINGHUB_API_KEY_3   → 3 slots  ○ (adicionar secret)   │
│  Conta 4: RUNNINGHUB_API_KEY_4   → 3 slots  ○ (adicionar secret)   │
│  Conta 5: RUNNINGHUB_API_KEY_5   → 3 slots  ○ (adicionar secret)   │
├───────────────────────────────────────────────────────────────────┤
│  TOTAL: slots_por_conta × contas_ativas                           │
│  Ex: 3 × 2 = 6 slots simultâneos                                  │
└───────────────────────────────────────────────────────────────────┘
```

---

## Implementação Concluída

### 1. ✅ Migração SQL - Coluna `api_account`

Adicionada em todas as 4 tabelas de jobs:
- `upscaler_jobs.api_account`
- `pose_changer_jobs.api_account`
- `veste_ai_jobs.api_account`
- `video_upscaler_jobs.api_account`

Valores: `'primary'`, `'account_2'`, `'account_3'`, `'account_4'`, `'account_5'`

### 2. ✅ Queue Manager Refatorado

Arquivo: `supabase/functions/runninghub-queue-manager/index.ts`

Funcionalidades:
- Detecta automaticamente quais API keys estão configuradas
- Balanceia jobs entre contas disponíveis (3 slots por conta)
- Retorna `accountName` e `accountApiKey` no endpoint `/check`
- Rastreia `api_account` ao processar jobs da fila

### 3. ✅ Edge Functions Adaptadas

Arquivos modificados:
- `supabase/functions/runninghub-upscaler/index.ts`
- `supabase/functions/runninghub-pose-changer/index.ts`
- `supabase/functions/runninghub-veste-ai/index.ts`
- `supabase/functions/runninghub-video-upscaler/index.ts`

Mudanças:
- Recebem `accountName` e `accountApiKey` do Queue Manager
- Usam a API key da conta atribuída
- Gravam `api_account` no job para rastreamento

### 4. ✅ Endpoint `/status` Atualizado

Retorna informações detalhadas por conta:

```json
{
  "totalMaxSlots": 6,
  "totalRunning": 4,
  "totalSlotsAvailable": 2,
  "totalQueued": 2,
  "accounts": [
    { "name": "primary", "running": 3, "maxSlots": 3, "available": 0 },
    { "name": "account_2", "running": 1, "maxSlots": 3, "available": 2 }
  ],
  "queuedByTool": {
    "upscaler_jobs": 1,
    "pose_changer_jobs": 0,
    "veste_ai_jobs": 1,
    "video_upscaler_jobs": 0
  }
}
```

---

## Como Adicionar Novas Contas

### Passo 1: Criar Conta no RunningHub
1. Acesse runninghub.ai
2. Crie uma nova conta
3. Obtenha a API Key

### Passo 2: Adicionar Secret no Lovable
1. Vá em Cloud → Secrets
2. Adicione a secret com o nome correto:
   - Segunda conta: `RUNNINGHUB_API_KEY_2`
   - Terceira conta: `RUNNINGHUB_API_KEY_3`
   - E assim por diante...

### Passo 3: Pronto!
O sistema detectará automaticamente a nova conta e começará a usá-la.
Nenhuma mudança de código necessária.

---

## Considerações de Custo

| Contas | Slots Totais | Jobs Simultâneos |
|--------|--------------|------------------|
| 1 | 3 | 3 |
| 2 | 6 | 6 |
| 3 | 9 | 9 |
| 4 | 12 | 12 |
| 5 | 15 | 15 |

O dashboard de métricas soma os custos de todos os jobs independente da conta.
