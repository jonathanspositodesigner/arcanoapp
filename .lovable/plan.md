
# Correção: Webhook de Video Upscaler não entende formato do RunningHub

## Problema Identificado

O webhook `runninghub-video-upscaler-webhook` está recebendo o payload do RunningHub, mas **não consegue extrair os dados corretamente** porque o formato é diferente do esperado.

### Payload recebido (formato real):
```json
{
  "eventData": {
    "taskId": "2018819290219810818",
    "status": "SUCCESS",
    "results": [{"url": "https://...mp4", "outputType": "mp4"}]
  },
  "event": "TASK_END",
  "taskId": "2018819290219810818"
}
```

### O que o código esperava:
```json
{
  "taskId": "...",
  "status": "SUCCESS",
  "results": [...]
}
```

### Resultado:
- `payload.status` = `undefined` (porque `status` está dentro de `eventData`)
- Código cai no `else` → "Unknown status: undefined"
- Job fica preso em `running` para sempre
- Interface nunca atualiza

---

## Solução

Modificar o webhook para extrair os dados de `eventData` quando presente:

### Arquivo: `supabase/functions/runninghub-video-upscaler-webhook/index.ts`

**Antes (linhas 26-30):**
```typescript
const taskId = payload.taskId;
const status = payload.status;
const results = payload.results || [];
const errorMessage = payload.errorMessage || payload.failedReason?.message || "";
const usage = payload.usage || {};
```

**Depois:**
```typescript
// RunningHub envia dados dentro de eventData para webhooks de vídeo
const eventData = payload.eventData || payload;

const taskId = eventData.taskId || payload.taskId;
const status = eventData.status;
const results = eventData.results || [];
const errorMessage = eventData.errorMessage || eventData.failedReason?.message || "";
const usage = eventData.usage || {};
```

---

## Por que só acontece no Video Upscaler?

O RunningHub usa formatos de webhook diferentes para diferentes tipos de processamento. O formato `eventData` parece ser específico para workloads de vídeo com `event: "TASK_END"`.

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Status = undefined | Status = SUCCESS/FAILED |
| Job fica em `running` | Job atualiza para `completed` |
| Interface trava | Interface mostra resultado |
| output_url nunca é salvo | output_url é extraído corretamente |
