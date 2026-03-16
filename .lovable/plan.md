

## Diagnóstico Confirmado: Queue Manager com Node IDs Antigos

### O que aconteceu

O Arcano Cloner tem **dois caminhos** para iniciar um job na RunningHub:

1. **Caminho direto** (`runninghub-arcano-cloner/run`) - quando tem slot disponível, a Edge Function do Arcano Cloner inicia direto. Usa os node IDs **corretos v2**: 58, 62, 133, 135, **145**.

2. **Caminho pela fila** (`runninghub-queue-manager/process-next`) - quando não tem slot, o job é enfileirado. Quando um slot libera, o Queue Manager inicia o job. Usa node IDs **antigos**: 58, 62, **69**, **85**, 133, 135.

O primeiro job deu certo porque foi pelo caminho direto (`waited_in_queue: false`). O segundo falhou porque foi pela fila (`waited_in_queue: true`) e o Queue Manager enviou `nodeId: "85"` que não existe no workflow v2.

**Prova nos dados**: TODOS os 4 jobs recentes com `waited_in_queue=true` falharam com "Failed to start job". Todos os jobs com `waited_in_queue=false` funcionaram.

**Log exato**: `NODE_INFO_MISMATCH(nodeId=85, fieldName=aspectRatio, reason=node_not_found_in_workflow)`

**Urgente**: O job `98e82932` está travado em `queued` agora e vai falhar quando for processado.

### Correção

**Arquivo**: `supabase/functions/runninghub-queue-manager/index.ts`, linhas 1157-1167

Trocar o bloco `case 'arcano_cloner_jobs'` para usar o mapeamento idêntico ao da Edge Function direta:

```typescript
// ANTES (antigo, com nós que não existem)
case 'arcano_cloner_jobs':
  webappId = WEBAPP_IDS.arcano_cloner_jobs;
  nodeInfoList = [
    { nodeId: "58", fieldName: "image", fieldValue: job.user_image_url || job.user_file_name },
    { nodeId: "62", fieldName: "image", fieldValue: job.reference_image_url || job.reference_file_name },
    { nodeId: "69", fieldName: "text", fieldValue: job.prompt || '...' },        // ❌ NÃO EXISTE
    { nodeId: "85", fieldName: "aspectRatio", fieldValue: job.aspect_ratio },    // ❌ NÃO EXISTE
    { nodeId: "133", fieldName: "value", fieldValue: String(job.creativity ?? 0) },
    { nodeId: "135", fieldName: "text", fieldValue: job.custom_prompt || '' },
  ];
  break;

// DEPOIS (idêntico à Edge Function direta)
case 'arcano_cloner_jobs':
  webappId = WEBAPP_IDS.arcano_cloner_jobs;
  nodeInfoList = [
    { nodeId: "58", fieldName: "image", fieldValue: job.user_image_url || job.user_file_name },
    { nodeId: "62", fieldName: "image", fieldValue: job.reference_image_url || job.reference_file_name },
    { nodeId: "133", fieldName: "value", fieldValue: String(job.creativity ?? 0) },
    { nodeId: "135", fieldName: "text", fieldValue: job.custom_prompt || '' },
    { nodeId: "145", fieldName: "aspectRatio", fieldValue: job.aspect_ratio || '1:1' },
  ];
  break;
```

Mudanças:
- **Remover** nodeId `"69"` (prompt antigo, não existe no workflow v2)
- **Trocar** nodeId `"85"` por `"145"` para aspectRatio
- Redeploy da Edge Function

