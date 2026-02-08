
## Resumo
Implementar fallback automático para o workflow **"De Longe" (pessoas_longe)**: quando falhar na RunningHub, o sistema vai **automaticamente tentar de novo** usando o workflow **"Perto" (Standard)**, sem intervenção do usuário.

---

## Como vai funcionar

```text
┌─────────────────────────────────────────────────────────────────┐
│                     FLUXO DO FALLBACK                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   1. Usuário escolhe: Pessoas → De Longe                       │
│              ↓                                                  │
│   2. Edge Function usa WEBAPP_ID_LONGE (2017343414227963905)   │
│              ↓                                                  │
│   3. RunningHub processa...                                    │
│              ↓                                                  │
│   4. Webhook recebe resultado                                  │
│              ↓                                                  │
│   ┌─────────┴─────────┐                                        │
│   │                   │                                        │
│   ▼                   ▼                                        │
│ SUCESSO            FALHOU                                      │
│   │                   │                                        │
│   │                   ▼                                        │
│   │      É job "De Longe" (categoria = pessoas_longe)?         │
│   │                   │                                        │
│   │           ┌───────┴───────┐                                │
│   │           │               │                                │
│   │          SIM             NÃO                               │
│   │           │               │                                │
│   │           ▼               ▼                                │
│   │    Já tentou fallback?   Falha normal                      │
│   │           │               (estorna créditos)               │
│   │      ┌────┴────┐                                           │
│   │     NÃO       SIM                                          │
│   │      │         │                                           │
│   │      ▼         ▼                                           │
│   │   RETRY COM  Falha final                                   │
│   │   WEBAPP     (estorna créditos)                            │
│   │   STANDARD                                                 │
│   │      │                                                     │
│   │      ▼                                                     │
│   │   Nova chamada RunningHub                                  │
│   │   com nodes 26, 25, 75, 128                                │
│   │                                                            │
│   ▼                                                            │
│ FIM (resultado pro usuário)                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Mudanças técnicas

### 1. Tabela `upscaler_jobs` - Novo campo para controle de fallback

```sql
ALTER TABLE upscaler_jobs 
ADD COLUMN IF NOT EXISTS fallback_attempted BOOLEAN DEFAULT false;
```

Esse campo marca se já tentamos o fallback, para não ficar em loop infinito.

---

### 2. Edge Function `runninghub-webhook/index.ts` - Lógica de fallback

Quando receber `TASK_END` com status `FAILED`:

```typescript
// Verificar se é candidato a fallback:
// 1. categoria = 'pessoas_longe' (modo De Longe)
// 2. fallback_attempted = false (ainda não tentou)
// 3. status atual = failed

if (
  jobData.category === 'pessoas_longe' && 
  !jobData.fallback_attempted &&
  taskStatus === 'FAILED'
) {
  console.log('[Webhook] Fallback triggered for De Longe job');
  
  // Marcar que vamos tentar fallback
  await supabase
    .from('upscaler_jobs')
    .update({ 
      fallback_attempted: true,
      error_message: 'Fallback: tentando workflow alternativo...'
    })
    .eq('id', jobData.id);
  
  // Chamar edge function para retry com workflow Standard
  await triggerFallbackRetry(jobData);
  
  return; // Não finaliza o job ainda
}
```

---

### 3. Nova Edge Function `runninghub-upscaler/retry-fallback` 

Ou adicionar um endpoint `/fallback` no `runninghub-upscaler`:

```typescript
async function handleFallback(req: Request) {
  const { jobId } = await req.json();
  
  // Buscar job original
  const { data: job } = await supabase
    .from('upscaler_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  
  // Re-executar com WEBAPP_ID_STANDARD
  const webappId = WEBAPP_ID_STANDARD; // Força usar o de Perto
  
  const nodeInfoList = [
    { nodeId: "26", fieldName: "image", fieldValue: job.input_file_name },
    { nodeId: "25", fieldName: "value", fieldValue: job.detail_denoise || 0.15 },
    { nodeId: "75", fieldName: "value", fieldValue: String(job.resolution || 2048) },
  ];
  
  // Adicionar prompt se existir
  if (job.prompt) {
    nodeInfoList.push({ nodeId: "128", fieldName: "text", fieldValue: job.prompt });
  }
  
  // Chamar RunningHub com novo workflow
  const response = await fetch(
    `https://www.runninghub.ai/openapi/v2/run/ai-app/${webappId}`,
    { /* ... */ }
  );
  
  // Atualizar task_id do job
  const data = await response.json();
  if (data.taskId) {
    await supabase
      .from('upscaler_jobs')
      .update({ 
        task_id: data.taskId,
        status: 'running',
        error_message: null,
        current_step: 'fallback_running'
      })
      .eq('id', jobId);
  }
}
```

---

### 4. Gravar `category` no banco (correção importante)

Atualmente o frontend não grava `category` no insert inicial. Preciso garantir que esse campo seja persistido para o fallback funcionar:

**Arquivo:** `src/pages/UpscalerArcanoTool.tsx`

```typescript
// No insert inicial do job, adicionar:
.insert({
  session_id: sessionIdRef.current,
  status: 'pending',
  detail_denoise: detailDenoise,
  prompt: getFinalPrompt(),
  user_id: user.id,
  category: isLongeMode ? 'pessoas_longe' : promptCategory, // NOVO
  version: version,                                          // NOVO
  resolution: resolutionValue,                               // NOVO
  framing_mode: framingMode,                                 // NOVO
})
```

---

## Arquivos que serão modificados

| Arquivo | Mudança |
|---------|---------|
| `supabase/migrations/xxx.sql` | Adicionar coluna `fallback_attempted` |
| `supabase/functions/runninghub-webhook/index.ts` | Detectar falha de "De Longe" e chamar fallback |
| `supabase/functions/runninghub-upscaler/index.ts` | Adicionar handler `/fallback` para retry |
| `src/pages/UpscalerArcanoTool.tsx` | Gravar `category`, `version`, `resolution`, `framing_mode` no insert |

---

## Comportamento para o usuário

1. Usuário escolhe **Pessoas → De Longe** e clica processar
2. Se o workflow "De Longe" falhar na RunningHub:
   - O sistema **automaticamente** tenta de novo com o workflow "Perto" (Standard)
   - O usuário vê o status continuar como "processando" (sem perceber a falha)
   - Se o fallback funcionar, recebe a imagem normalmente
3. Se o fallback também falhar:
   - Aí sim mostra erro e estorna os créditos
   - Mensagem: "Não foi possível processar esta imagem"

---

## Vantagens desta abordagem

- **Transparente para o usuário**: ele não precisa fazer nada
- **Sem custo extra**: não cobra créditos duas vezes (já foi cobrado no início)
- **Idempotente**: o flag `fallback_attempted` evita loops infinitos
- **Rastreável**: o `step_history` vai registrar que houve fallback

---

## Seção técnica - Detalhes de implementação

### Node mapping do fallback

| Workflow Original (De Longe) | Workflow Fallback (Standard) |
|------------------------------|------------------------------|
| WebApp: 2017343414227963905  | WebApp: 2017030861371219969  |
| Node 1 (image)               | Node 26 (image)              |
| Node 7 (resolution)          | Node 75 (resolution)         |
| ❌ Sem denoise               | Node 25 (denoise = 0.15)     |
| ❌ Sem prompt                | Node 128 (prompt)            |

### Campos necessários no job para fallback funcionar

- `input_file_name`: nome do arquivo já enviado à RunningHub (reutilizado)
- `detail_denoise`: valor original (usa default 0.15 se não tiver)
- `resolution`: 2048 ou 4096
- `prompt`: texto do prompt (usa o de pessoas_perto como fallback)
- `category`: precisa ser 'pessoas_longe' para identificar candidatos
