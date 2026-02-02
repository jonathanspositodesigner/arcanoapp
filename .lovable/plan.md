

# Plano de Eliminação Total de Custos Cloud

## Diagnóstico Atual

### 🚨 Problemas Críticos Identificados

| # | Problema | Impacto Estimado | Status |
|---|----------|------------------|--------|
| 1 | **Watchdog Email Marketing (Frontend)** | ~$2-3/dia | REMOVER - você não usa |
| 2 | **Watchdog Importação CSV (Frontend)** | ~$1-2/dia | REMOVER - você não usa |
| 3 | **Cron Remarketing (a cada 10min)** | ~$3-5/dia | REMOVER - função não existe |
| 4 | **process-sending-campaigns (Edge)** | ~$1-2/dia | REMOVER - você não usa |
| 5 | **Push Notification Loop Sequencial** | ~$1-2/por envio | OTIMIZAR - você usa |
| 6 | **Upscaler Double Download** | ~$0.50/upscale | OTIMIZAR - você usa |

---

## Correções a Implementar

### FASE 1: Remoção Completa (Economia Imediata)

#### 1.1 Desativar Watchdog de Email Marketing
**Arquivo:** `src/hooks/useEmailCampaignProgress.ts`

**Ação:** Remover completamente o `setInterval` de 15 segundos que verifica se campanhas estão "travadas" e invoca a Edge Function.

**Código a remover (linhas 87-99):**
```typescript
// REMOVER TODO ESTE BLOCO:
watchdogIntervalRef.current = setInterval(() => {
  if (activeCampaign && activeCampaign.status === 'sending' && !activeCampaign.is_paused) {
    const timeSinceLastUpdate = Date.now() - lastUpdateRef.current;
    if (timeSinceLastUpdate > 45000) {
      triggerRecovery(activeCampaign.id);
      lastUpdateRef.current = Date.now();
    }
  }
}, 15000);
```

#### 1.2 Desativar Watchdog de Importação CSV
**Arquivo:** `src/hooks/useImportProgress.ts`

**Ação:** Remover completamente o watchdog de 15 segundos que reinvoca `process-import-job`.

**Código a remover (linhas 194-201):**
```typescript
// REMOVER TODO ESTE BLOCO:
const initialCheck = setTimeout(() => {
  checkAndReconnect(importProgress.jobId!);
}, 5000);

watchdogRef.current = setInterval(() => {
  checkAndReconnect(importProgress.jobId!);
}, WATCHDOG_INTERVAL_MS);
```

#### 1.3 Desativar Cron Job de Remarketing
**Novo arquivo SQL a executar:** Desagendar o job que roda a cada 10 minutos e chama uma função que não existe.

```sql
SELECT cron.unschedule('process-remarketing-emails-job');
```

#### 1.4 Remover Edge Function de Campanhas
**Arquivo:** `supabase/functions/process-sending-campaigns/` (pasta inteira)

**Ação:** Deletar a Edge Function que verifica campanhas "travadas" - você não usa email marketing.

---

### FASE 2: Otimização de Push Notifications

#### 2.1 Processamento em Lotes (Batch)
**Arquivo:** `supabase/functions/send-push-notification/index.ts`

**Problema atual (linhas 344-364):** Loop sequencial - processa 1 subscriber por vez.

**Solução:** Processar em lotes paralelos de 10 usando `Promise.all`.

**Código atual:**
```typescript
for (const sub of subscriptions) {
  const result = await sendPushNotification(...);
  // ...
}
```

**Novo código:**
```typescript
// Processar em lotes de 10 para evitar timeout
const BATCH_SIZE = 10;
for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
  const batch = subscriptions.slice(i, i + BATCH_SIZE);
  const results = await Promise.all(
    batch.map(sub => sendPushNotification(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      notificationPayload,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY,
      "mailto:contato@voxvisual.com"
    ))
  );
  
  for (let j = 0; j < results.length; j++) {
    const result = results[j];
    const sub = batch[j];
    if (result.success) {
      sentCount++;
    } else {
      failedCount++;
      if (result.statusCode === 404 || result.statusCode === 410) {
        expiredEndpoints.push(sub.endpoint);
      }
    }
  }
}
```

**Economia:** Reduz tempo de execução em ~80% (de 100s para ~20s para 100 subscribers).

---

### FASE 3: Otimização do Upscaler

#### 3.1 Eliminar Double Download na Edge Function
**Arquivo:** `supabase/functions/runninghub-upscaler/index.ts`

**Problema atual:** A Edge Function baixa a imagem do Supabase Storage e faz upload para o RunningHub. Isso consome bandwidth de entrada E saída.

**Solução alternativa:** Verificar se o RunningHub aceita URL direta. Se sim, passar apenas a URL pública sem baixar.

**Investigação necessária:** Preciso verificar se a API do RunningHub pode aceitar uma URL de imagem em vez de um arquivo.

---

## Arquivos a Modificar

| Arquivo | Ação | Prioridade |
|---------|------|------------|
| `src/hooks/useEmailCampaignProgress.ts` | Remover watchdog | CRÍTICA |
| `src/hooks/useImportProgress.ts` | Remover watchdog | CRÍTICA |
| `supabase/functions/process-sending-campaigns/` | DELETAR pasta | CRÍTICA |
| SQL Query | Desagendar cron job | CRÍTICA |
| `supabase/functions/send-push-notification/index.ts` | Batch processing | ALTA |

---

## Economia Projetada

| Problema | Custo Atual/dia | Custo Após |
|----------|-----------------|------------|
| Watchdog Email (não usa) | ~$2-3 | $0 |
| Watchdog Import (não usa) | ~$1-2 | $0 |
| Cron Remarketing (não existe) | ~$3-5 | $0 |
| process-sending-campaigns | ~$1-2 | $0 |
| Push sequencial | ~$1-2/envio | ~$0.20/envio |
| **TOTAL** | **~$8-14/dia** | **~$0.50/dia** |

**Economia mensal estimada: $200-400**

---

## Resumo Visual

```
ANTES (Sangria de Dinheiro):
┌─────────────────────────────────────────────────────────┐
│ Cron 10min → Função inexistente → Erro 404 → $$$       │
│ Watchdog 15s → Invoca Edge Function → $$$               │
│ Push 1 por vez → Timeout longo → $$$                    │
└─────────────────────────────────────────────────────────┘

DEPOIS (Custo Mínimo):
┌─────────────────────────────────────────────────────────┐
│ Cron removido → $0                                      │
│ Watchdogs removidos → $0                                │
│ Push em lote → Execução 5x mais rápida → $              │
└─────────────────────────────────────────────────────────┘
```

---

## Ordem de Implementação

1. **Imediato:** Remover watchdogs (useEmailCampaignProgress, useImportProgress)
2. **Imediato:** Desagendar cron job de remarketing
3. **Imediato:** Deletar process-sending-campaigns
4. **Alta prioridade:** Otimizar send-push-notification com batch
5. **Monitorar:** Verificar consumo após 24h

