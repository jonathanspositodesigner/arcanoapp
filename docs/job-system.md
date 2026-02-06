# Sistema de Jobs de IA - Documentação Técnica

## Visão Geral

Este documento define as regras obrigatórias para o sistema centralizado de jobs de IA do Arcano.
Todas as ferramentas de IA (Upscaler, Pose Changer, Veste AI, Video Upscaler) devem seguir estas regras.

## Arquitetura

```
┌────────────────────────────────────────────────────────────┐
│                      FRONTEND                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ src/ai/JobManager.ts (Única fonte de verdade)        │  │
│  │ • checkActiveJob() • cancelJob() • subscribeToJob()  │  │
│  └──────────────────────────────────────────────────────┘  │
│              ↓                                              │
│  Tool Pages: upload → insert → invoke edge function        │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│                      BACKEND                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ runninghub-queue-manager (Orquestrador Central)      │  │
│  │ • /check • /enqueue • /finish • /process-next        │  │
│  └──────────────────────────────────────────────────────┘  │
│              ↓                                              │
│  Edge Functions: validação → créditos → RunningHub         │
│              ↓                                              │
│  Webhooks: delegam para QueueManager /finish               │
└────────────────────────────────────────────────────────────┘
```

## Regras de Negócio (OBRIGATÓRIAS)

### 1. Limite Global de Concorrência
- **Máximo 3 jobs simultâneos** em status `STARTING` ou `RUNNING`
- Gerenciado exclusivamente pelo `runninghub-queue-manager`
- Nenhuma ferramenta pode ter contador de concorrência próprio

### 2. Fila FIFO Global
- Jobs em `QUEUED` são processados na ordem de `created_at ASC`
- A fila é GLOBAL entre todas as ferramentas
- Posições são recalculadas automaticamente pelo QueueManager

### 3. Um Job por Usuário
- Cada usuário só pode ter 1 job ativo por vez (em qualquer ferramenta)
- Verificar via `JobManager.checkActiveJob(userId)` no frontend
- Ou via endpoint `/check-user-active` no backend
- Estados que bloqueiam: `queued`, `starting`, `running`

### 4. Erro = Estado Terminal
- Qualquer erro leva o job para `FAILED` (terminal)
- **NÃO existe retry automático** - falhou, acabou
- Mensagem de erro real da API é exibida ao usuário
- Créditos são reembolsados automaticamente

### 5. Webhook Finaliza
- Somente o QueueManager `/finish` atualiza o status final
- Webhooks da RunningHub devem delegar para `/finish`
- Isso garante atomicidade e idempotência

### 6. Reembolso Idempotente
- Sistema usa flags `credits_charged` e `credits_refunded`
- Só reembolsa se: `credits_charged = true` E `credits_refunded = false`
- Após reembolso: marca `credits_refunded = true`
- Isso previne reembolsos duplicados

## Estados do Job

| Estado | Descrição | Ocupa Vaga? |
|--------|-----------|-------------|
| `queued` | Aguardando vaga na fila | ❌ Não |
| `starting` | Vaga reservada, iniciando no provedor | ✅ Sim |
| `running` | Provedor processando ativamente | ✅ Sim |
| `completed` | Sucesso, resultado disponível | ❌ Terminal |
| `failed` | Erro, reembolso processado | ❌ Terminal |
| `cancelled` | Cancelado pelo usuário, reembolso processado | ❌ Terminal |

## Transições Válidas

```
queued → starting (quando vaga libera)
starting → running (quando provedor aceita)
running → completed (webhook sucesso)
running → failed (webhook erro)
queued → cancelled (cancelamento usuário)
starting → cancelled (cancelamento usuário)
running → cancelled (cancelamento usuário)
starting → failed (timeout 10min)
running → failed (timeout 10min)
```

## Contrato para Nova Ferramenta

### Checklist Obrigatório:

1. **Frontend**
   - [ ] Chamar `checkActiveJob(userId)` antes de criar job
   - [ ] Usar `useProcessingButton()` para prevenir cliques duplos
   - [ ] Upload de arquivos ANTES de criar registro no banco
   - [ ] Usar `cancelJob()` do JobManager para cancelamento
   - [ ] Usar `useQueueSessionCleanup()` para limpar ao sair

2. **Edge Function**
   - [ ] Verificar disponibilidade via QueueManager `/check`
   - [ ] Se sem vaga: delegar para QueueManager `/enqueue`
   - [ ] Consumir créditos via RPC `consume_upscaler_credits`
   - [ ] **CRÍTICO**: Marcar `credits_charged = true` após consumo
   - [ ] Chamar RunningHub com `webhookUrl` configurado

3. **Webhook**
   - [ ] Receber eventos da RunningHub
   - [ ] Delegar 100% para QueueManager `/finish`
   - [ ] Não fazer updates diretos no banco

4. **Banco de Dados**
   - [ ] Tabela `{tool}_jobs` com colunas obrigatórias:
     - `id`, `user_id`, `session_id`, `status`
     - `credits_charged`, `credits_refunded`, `user_credit_cost`
     - `created_at`, `completed_at`, `error_message`
     - `position`, `waited_in_queue`

## Mapeamento de Ferramentas

| Ferramenta | Tabela | Edge Function | Webhook |
|------------|--------|---------------|---------|
| Upscaler Arcano | `upscaler_jobs` | `runninghub-upscaler/run` | `runninghub-webhook` |
| Pose Changer | `pose_changer_jobs` | `runninghub-pose-changer/run` | `runninghub-webhook` |
| Veste AI | `veste_ai_jobs` | `runninghub-veste-ai/run` | `runninghub-webhook` |
| Video Upscaler | `video_upscaler_jobs` | `runninghub-video-upscaler/run` | `runninghub-video-upscaler-webhook` |

## Anti-Stuck (Jobs Presos)

### Mecanismos de Proteção:

1. **Cleanup Oportunístico**
   - RPC `cleanup_all_stale_ai_jobs()` chamada a cada requisição ao QueueManager
   - Cancela jobs em `running/queued/starting` há mais de 10 minutos
   - Reembolsa créditos automaticamente

2. **Timeout de 10 minutos**
   - Gerenciado pelo cleanup oportunístico do QueueManager
   - Jobs em `running/starting` há mais de 10 minutos são cancelados

3. **Webhook Idempotente**
   - Verifica flags antes de processar
   - Ignora webhooks duplicados

## Código Exemplo

### Frontend - Iniciar Job
```typescript
import { checkActiveJob, cancelJob } from '@/ai/JobManager';
import { useProcessingButton } from '@/hooks/useProcessingButton';

const { isSubmitting, startSubmit, endSubmit } = useProcessingButton();

const handleProcess = async () => {
  if (!startSubmit()) return; // Bloqueia clique duplo
  
  try {
    // Verificar job ativo
    const activeCheck = await checkActiveJob(user.id);
    if (activeCheck.hasActiveJob) {
      showActiveJobModal(activeCheck);
      return;
    }
    
    // Upload primeiro (previne órfãos)
    const imageUrl = await uploadToStorage(file);
    
    // Criar job no banco
    const { data: job } = await supabase
      .from('tool_jobs')
      .insert({ user_id, session_id, status: 'queued' })
      .select()
      .single();
    
    // Chamar edge function
    await supabase.functions.invoke('tool-function/run', {
      body: { jobId: job.id, imageUrl, creditCost }
    });
    
  } finally {
    endSubmit();
  }
};
```

### Backend - Edge Function
```typescript
// Consumir créditos
const { data: creditResult } = await supabase.rpc('consume_upscaler_credits', {
  _user_id: userId,
  _amount: creditCost,
  _description: 'Tool usage'
});

if (!creditResult[0].success) {
  return new Response(JSON.stringify({ code: 'INSUFFICIENT_CREDITS' }));
}

// CRÍTICO: Marcar como cobrado
await supabase
  .from('tool_jobs')
  .update({ credits_charged: true, user_credit_cost: creditCost })
  .eq('id', jobId);

// Verificar fila
const queueResponse = await fetch(`${SUPABASE_URL}/functions/v1/runninghub-queue-manager/check`);
const queueData = await queueResponse.json();

if (queueData.slotsAvailable <= 0) {
  // Enfileirar via QueueManager
  await fetch(`${SUPABASE_URL}/functions/v1/runninghub-queue-manager/enqueue`, {
    body: JSON.stringify({ jobId, tableName: 'tool_jobs' })
  });
  return new Response(JSON.stringify({ queued: true }));
}

// Iniciar no provedor...
```

## Proibições

❌ **NUNCA** faça:
- Criar lógica de fila local por ferramenta
- Manter contador de concorrência próprio
- Fazer retry automático de jobs falhos
- Atualizar status final fora do QueueManager
- Consumir créditos sem marcar `credits_charged = true`
- Criar job no banco antes de fazer upload de arquivos

## Histórico de Mudanças

| Data | Mudança |
|------|---------|
| 2025-02-05 | Criação do documento |
| 2025-02-05 | Adicionado flag `credits_charged` em todas as edge functions |
| 2025-02-05 | Removidas funções duplicadas de fila do video-upscaler |
