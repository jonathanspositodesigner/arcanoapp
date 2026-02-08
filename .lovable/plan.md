
## Objetivo
Atualizar o motor da API do modo "Pessoas > De Longe" para usar um novo WebApp ID na RunningHub, pois o atual (`2017343414227963905`) quebrou.

---

## Análise do Sistema Atual

O código **já usa a API v2** corretamente:
```typescript
// Linha 874 do runninghub-upscaler/index.ts
const response = await fetchWithRetry(
  `https://www.runninghub.ai/openapi/v2/run/ai-app/${webappId}`,
  { method: 'POST', ... }
);
```

O problema é que o WebApp ID atual do modo "De Longe" quebrou na RunningHub:
```typescript
// Linha 18 do runninghub-upscaler/index.ts
const WEBAPP_ID_LONGE = '2017343414227963905';  // ❌ QUEBRADO
```

Os nodes usados atualmente para "De Longe":
```typescript
// Linhas 826-829
nodeInfoList = [
  { nodeId: "1", fieldName: "image", fieldValue: rhFileName },
  { nodeId: "7", fieldName: "value", fieldValue: String(resolution || 2048) },
];
```

---

## Informação Necessária

Para fazer a correção, preciso que você forneça:

1. **Novo WebApp ID** para o modo "Pessoas > De Longe"
2. **NodeIds** do novo workflow:
   - Qual nodeId para a **imagem** de entrada?
   - Qual nodeId para a **resolução** (se houver)?
   - Há outros parâmetros necessários?

---

## O Que Será Alterado (após você fornecer os dados)

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/runninghub-upscaler/index.ts` | Atualizar `WEBAPP_ID_LONGE` e `nodeInfoList` para "De Longe" |
| `supabase/functions/runninghub-queue-manager/index.ts` | Atualizar `WEBAPP_IDS.upscaler_jobs.longe` e `nodeInfoList` no processador de fila |
| `supabase/functions/runninghub-webhook/index.ts` | Atualizar `WEBAPP_ID_LONGE` para o fallback De Longe → Standard |

---

## Exemplo do Que Preciso

Baseado na documentação que você enviou, algo como:

```json
{
  "webappId": "2020634325636616194",  // Novo ID
  "nodeInfoList": [
    {
      "nodeId": "1",
      "fieldName": "image",
      "description": "sua foto aqui"
    },
    {
      "nodeId": "2",
      "fieldName": "value",
      "fieldValue": "4096",
      "description": "resolução"
    }
  ]
}
```

Por favor, forneça o **novo WebApp ID** e os **nodeIds** do workflow "De Longe" na RunningHub para que eu possa fazer a atualização.
