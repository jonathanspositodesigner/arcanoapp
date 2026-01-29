

# Plano: Corrigir Integração RunningHub (Baseado na Documentação Oficial)

## Problemas Encontrados

Analisei cada print da documentação e encontrei múltiplos erros no código atual:

| Problema | Código Atual | Documentação |
|----------|--------------|--------------|
| URL da API | `task/openapi/ai-app/run` | `openapi/v2/run/ai-app/{WEBAPP_ID}` |
| Autenticação | `apiKey` no body | `Authorization: Bearer` header |
| Webhook payload | `payload.status`, `payload.results` | `payload.eventData.status`, `payload.eventData.results` |
| Campos do result | `fileUrl`, `fileType` | `url`, `outputType` |

---

## Correções Necessárias

### 1. `supabase/functions/runninghub-upscaler/index.ts`

**Corrigir URL e formato da requisição (linha ~261):**

```typescript
// ANTES (errado):
const requestBody = {
  apiKey: RUNNINGHUB_API_KEY,
  webappId: WEBAPP_ID,
  nodeInfoList: nodeInfoList,
  webhookUrl: webhookUrl,
};

const response = await fetch('https://www.runninghub.ai/task/openapi/ai-app/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(requestBody),
});

// DEPOIS (correto - conforme documentação):
const requestBody = {
  nodeInfoList: nodeInfoList,
  instanceType: "default",
  usePersonalQueue: false,
  webhookUrl: webhookUrl,
};

const response = await fetch(`https://www.runninghub.ai/openapi/v2/run/ai-app/${WEBAPP_ID}`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${RUNNINGHUB_API_KEY}`
  },
  body: JSON.stringify(requestBody),
});
```

**Corrigir parsing da resposta:**
```typescript
// ANTES:
if (data.code === 0 && data.data?.taskId) {

// DEPOIS (resposta vem direto, sem wrapper):
if (data.taskId && data.status) {
```

---

### 2. `supabase/functions/runninghub-webhook/index.ts`

**Corrigir parsing do webhook (linhas 26-70):**

```typescript
// ANTES (errado):
const event = payload.event || payload.type || 'TASK_END';
const taskId = payload.taskId || payload.data?.taskId || payload.task_id;
const taskStatus = payload.status || payload.data?.status || payload.taskStatus;

const outputs = payload.outputs || payload.data?.outputs || payload.results || [];

// DEPOIS (correto - conforme documentação):
const event = payload.event;
const taskId = payload.taskId;
const eventData = payload.eventData || {};
const taskStatus = eventData.status;

const results = eventData.results || [];
```

**Corrigir extração do output URL:**

```typescript
// ANTES (errado):
const imageOutput = outputs.find((o: any) => 
  o.fileType?.toLowerCase().includes('image') || 
  o.type?.toLowerCase().includes('image') ||
  o.fileUrl || o.url
);
outputUrl = imageOutput?.fileUrl || imageOutput?.url || outputs[0]?.fileUrl || outputs[0]?.url || null;

// DEPOIS (correto):
if (Array.isArray(results) && results.length > 0) {
  // Documentação: results[].url, results[].outputType, results[].text
  const imageResult = results.find((r: any) => 
    r.outputType === 'png' || r.outputType === 'jpg' || r.outputType === 'jpeg' || r.outputType === 'webp'
  );
  outputUrl = imageResult?.url || results[0]?.url || null;
}
```

**Corrigir extração de erro:**

```typescript
// ANTES:
if (taskStatus === 'FAILED' || payload.error) {
  errorMessage = payload.error || payload.errorMessage || payload.data?.error || 'Processing failed';
}

// DEPOIS (conforme imagem 385):
if (taskStatus === 'FAILED') {
  errorMessage = eventData.errorMessage || eventData.errorCode || 'Processing failed';
}
```

---

### 3. Sincronizar função `startRunningHubJob` no webhook

A mesma correção de URL e headers precisa ser aplicada na função `startRunningHubJob` (linha 175-239):

```typescript
const requestBody = {
  nodeInfoList: nodeInfoList,
  instanceType: "default",
  usePersonalQueue: false,
  webhookUrl: webhookUrl,
};

const response = await fetch(`https://www.runninghub.ai/openapi/v2/run/ai-app/${WEBAPP_ID}`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${RUNNINGHUB_API_KEY}`
  },
  body: JSON.stringify(requestBody),
});
```

---

## Resumo das Mudanças

| Arquivo | Mudança |
|---------|---------|
| `runninghub-upscaler/index.ts` | URL correta, Bearer auth, parsing resposta |
| `runninghub-webhook/index.ts` | Parsing eventData, campos corretos (url/outputType), startRunningHubJob sincronizado |

---

## Resultado Esperado

Após essas correções:
1. Upload de imagem continua funcionando (não muda)
2. Request para iniciar job vai para a URL correta com autenticação correta
3. Webhook vai parsear corretamente o payload do RunningHub
4. Output URL vai ser extraída do campo `results[].url` correto
5. Erros vão ser extraídos de `eventData.errorMessage`

