

# Plano: Corrigir Node IDs do RunningHub

## Problema

Os node IDs estão errados nas edge functions, causando o erro `APIKEY_INVALID_NODE_INFO`.

## Node IDs Corretos (da documentação oficial)

| Parâmetro | nodeId Atual (ERRADO) | nodeId Correto |
|-----------|----------------------|----------------|
| Imagem | "1" | **"26"** |
| Detail Denoise | "165" | **"25"** |
| Prompt | "prompt" | **"128"** |

## Arquivos a Modificar

### 1. `supabase/functions/runninghub-upscaler/index.ts`

Atualizar o `nodeInfoList` (linha ~236):

```typescript
// DE (errado):
const nodeInfoList: any[] = [
  { nodeId: "1", fieldName: "image", fieldValue: fileName },
  { nodeId: "165", fieldName: "value", fieldValue: detailDenoise || 0.15 },
];

// PARA (correto):
const nodeInfoList: any[] = [
  { nodeId: "26", fieldName: "image", fieldValue: fileName },
  { nodeId: "25", fieldName: "value", fieldValue: detailDenoise || 0.15 },
];

// E adicionar o prompt corretamente:
if (prompt) {
  nodeInfoList.push({ nodeId: "128", fieldName: "text", fieldValue: prompt });
}
```

### 2. `supabase/functions/runninghub-webhook/index.ts`

Atualizar o `nodeInfoList` na função `startRunningHubJob` (linha ~178):

```typescript
// DE (errado):
const nodeInfoList: any[] = [
  { nodeId: "1", fieldName: "image", fieldValue: job.input_file_name },
  { nodeId: "136:1", fieldName: "max_width", fieldValue: job.resolution || 4096 },
  { nodeId: "136:1", fieldName: "max_height", fieldValue: job.resolution || 4096 },
  { nodeId: "165", fieldName: "value", fieldValue: job.detail_denoise || 0.15 },
];

// PARA (correto):
const nodeInfoList: any[] = [
  { nodeId: "26", fieldName: "image", fieldValue: job.input_file_name },
  { nodeId: "25", fieldName: "value", fieldValue: job.detail_denoise || 0.15 },
];

if (job.prompt) {
  nodeInfoList.push({ nodeId: "128", fieldName: "text", fieldValue: job.prompt });
}
```

## Resumo das Mudanças

| Arquivo | Mudança |
|---------|---------|
| `runninghub-upscaler/index.ts` | Corrigir nodeId: 1→26, 165→25, adicionar prompt com 128 |
| `runninghub-webhook/index.ts` | Corrigir nodeId: 1→26, 165→25, remover resolution, adicionar prompt com 128 |

## Resultado Esperado

Após essas correções:
- Upload da imagem vai funcionar (nodeId 26)
- Slider de Detail Denoise vai funcionar (nodeId 25)
- Prompt customizado vai funcionar (nodeId 128)
- Erro `APIKEY_INVALID_NODE_INFO` vai sumir

