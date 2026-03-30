

# Plano: Veo 3.1 passa a usar apenas 1 imagem (sem start+end frame)

## Contexto
O workflow Veo 3.1 no RunningHub foi atualizado: agora aceita apenas **1 imagem** (nó 5, "LAST FRAME") + prompt + aspect_ratio. O segundo nó de Load Image (nó 15, "FIRST FRAME") foi removido. Wan 2.2 permanece com 2 frames.

## Mudanças

### 1. Frontend - `src/pages/GerarVideoTool.tsx`
- Quando `selectedModel === 'veo3.1'` e modo `with_frames`:
  - Remover o campo "Último Frame (fim)" / endFrame
  - Renomear "1º Frame (início)" para "Imagem de Referência"
  - Enviar apenas `start_frame` no body (sem `end_frame`) quando modelo for Veo 3.1
  - A validação muda: Veo 3.1 precisa de apenas 1 imagem; Wan 2.2 continua precisando de 2
  - Atualizar o label do botão de disabled: "Selecione a imagem de referência" (Veo) vs "Selecione o primeiro e último frame" (Wan)
  - O seta "→ 8s" entre os frames some quando Veo 3.1 (fica só o card de imagem único)

### 2. Edge Function - `supabase/functions/generate-video/index.ts`
- Continua aceitando `start_frame` e `end_frame` no body (para Wan 2.2 compatibilidade)
- Nenhuma mudança necessaria aqui -- o upload de frames já é condicional (`hasStartFrame`, `hasEndFrame`) e o job_payload já grava os fileNames separados

### 3. Queue Manager - `supabase/functions/runninghub-queue-manager/index.ts` (linhas 1542-1608)
- No case `video_generator_jobs`, quando `videoModel === 'veo3.1'`:
  - Mudar a lógica: `hasFrames` passa a ser `!!p.startFrameFileName` (basta 1 imagem, não precisa de 2)
  - Quando com imagem: usar webapp `2037253069662068738` (mesmo ID)
  - Enviar apenas **1 nó de imagem**: `nodeId: "5"`, `fieldName: "image"`, `fieldValue: p.startFrameFileName` (a imagem única vai no nó 5)
  - Remover o nó 15 (FIRST FRAME) do Veo 3.1
  - `nodeId` para aspect_ratio e prompt continua sendo `"3"` (com imagem) ou `"8"` (text-only)
- Wan 2.2 permanece inalterado (2 frames, nós 37+16)

### Resumo das mudanças por arquivo

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/GerarVideoTool.tsx` | UI adapta para 1 imagem quando Veo 3.1, mantém 2 frames para Wan 2.2 |
| `supabase/functions/generate-video/index.ts` | Sem mudanças (já é flexível) |
| `supabase/functions/runninghub-queue-manager/index.ts` | Veo 3.1 envia apenas nó 5 (imagem), remove nó 15 |

### nodeInfoList Veo 3.1 (com imagem) - APÓS correção
```json
[
  { "nodeId": "5", "fieldName": "image", "fieldValue": "<fileName>", "description": "LAST FRAME" },
  { "nodeId": "3", "fieldName": "aspect_ratio", "fieldData": "[...]", "fieldValue": "16:9" },
  { "nodeId": "3", "fieldName": "prompt", "fieldValue": "..." }
]
```

