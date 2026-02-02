

# Plano Completo: Otimização de Upload de Imagens e Redução de Consumo Cloud

## Diagnóstico Final

### 🚨 Problemas Críticos Identificados

| # | Problema | Arquivo(s) | Status Atual | Impacto |
|---|----------|------------|--------------|---------|
| 1 | **Upload Base64 para Edge Function** | `UpscalerArcanoTool.tsx` | ATIVO | ~$3-5 (bandwidth + compute) |
| 2 | **Upload DUPLO no V3** | `UpscalerArcanoV3.tsx` | ATIVO | ~$2-4 (bandwidth duplicado) |
| 3 | **Runpod Upscaler Base64** | `runpod-upscaler/index.ts` | DESATIVADO | $0 (página desabilitada) |

### ✅ Já Corrigidos (sessão anterior)
- Polling V3 → Migrado para Realtime
- Polling Runpod → Página desativada
- Loop N+1 Webhook → Usa `update_queue_positions()`
- Polling Pagamento → Removido completamente

### ✅ Já Otimizados
- `AdminUploadArtes.tsx` → Usa `uploadToStorage` + `optimizeImage`
- `useStorageUpload.ts` → Upload binário direto (sem Edge Function)
- `MudarPose.tsx`, `MudarRoupa.tsx`, `ForjaSelos3D.tsx` → Apenas tutoriais YouTube (sem uploads)

---

## Correções a Implementar

### Fase 1: UpscalerArcanoTool - Eliminar Base64

**Problema Atual:**
```
Usuário → Compressão local (bom) → Base64 (ruim: +33%) → Edge Function → RunningHub
```

**Solução:**
```
Usuário → Compressão local → Upload direto Storage → URL para Edge Function → RunningHub
```

**Arquivo:** `src/pages/UpscalerArcanoTool.tsx`

**Mudanças na função `processImage` (linhas 420-460):**

```typescript
// REMOVER (linha 432-454):
const base64Data = inputImage.split(',')[1];
const uploadResponse = await supabase.functions.invoke('runninghub-upscaler/upload', {
  body: { imageBase64: base64Data, fileName: inputFileName || 'image.png' },
});
// ... código de tratamento de erro do upload

// SUBSTITUIR POR:
// 1. Converter base64 para blob
const base64Data = inputImage.split(',')[1];
const binaryStr = atob(base64Data);
const bytes = new Uint8Array(binaryStr.length);
for (let i = 0; i < binaryStr.length; i++) {
  bytes[i] = binaryStr.charCodeAt(i);
}

const ext = (inputFileName || 'image.png').split('.').pop()?.toLowerCase() || 'png';
const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                 ext === 'webp' ? 'image/webp' : 'image/png';
const blob = new Blob([bytes], { type: mimeType });
const storagePath = `upscaler/${job.id}.${ext}`;

// 2. Upload direto ao Storage (GRÁTIS)
const { error: storageError } = await supabase.storage
  .from('artes-cloudinary')
  .upload(storagePath, blob, { contentType: mimeType, upsert: true });

if (storageError) {
  throw new Error('Erro no upload: ' + storageError.message);
}

// 3. Obter URL pública
const { data: urlData } = supabase.storage
  .from('artes-cloudinary')
  .getPublicUrl(storagePath);

console.log('[Upscaler] Image uploaded to storage:', urlData.publicUrl);
```

**Mudança na chamada de `/run` (linha 464-477):**
```typescript
// ADICIONAR imageUrl ao body:
const runResponse = await supabase.functions.invoke('runninghub-upscaler/run', {
  body: {
    jobId: job.id,
    imageUrl: urlData.publicUrl,  // NOVO: URL em vez de fileName
    // fileName removido - não mais necessário
    detailDenoise: isLongeMode ? null : detailDenoise,
    resolution: resolution === '4k' ? 4096 : 2048,
    prompt: isLongeMode ? null : getFinalPrompt(),
    version: version,
    framingMode: isLongeMode ? 'longe' : 'perto',
    userId: user.id,
    creditCost: creditCost,
  },
});
```

---

### Fase 2: UpscalerArcanoV3 - Remover Upload Duplicado

**Problema Atual (linhas 232-265):**
```typescript
// Passo 1: Upload para Storage (CORRETO)
const { error: uploadError } = await supabase.storage.from('artes-cloudinary').upload(...);
const { data: urlData } = supabase.storage.from('artes-cloudinary').getPublicUrl(...);

// Passo 2: Upload DUPLICADO para Edge Function (ERRADO - remove!)
const uploadResponse = await supabase.functions.invoke('runninghub-upscaler/upload', {
  body: { imageBase64: base64Data, fileName: inputFileName || 'image.png' },
});
```

**Solução:** Remover linhas 263-271 e modificar a chamada de `/run`:

```typescript
// REMOVER (linhas 262-272):
// Step 3: Upload to RunningHub (they need their own file reference)
const uploadResponse = await supabase.functions.invoke('runninghub-upscaler/upload', {...});
if (uploadResponse.error || !uploadResponse.data?.fileName) {...}
console.log('[UpscalerV3] RunningHub file:', uploadResponse.data.fileName);

// MANTER apenas a chamada de /run com imageUrl:
const runResponse = await supabase.functions.invoke('runninghub-upscaler/run', {
  body: {
    jobId: job.id,
    imageUrl: urlData.publicUrl,  // Usar URL do Storage
    // fileName: uploadResponse.data.fileName, // REMOVER
    mode,
    resolution,
    creativityDenoise,
    detailDenoise,
    version: 'standard',
    userId: null,
    creditCost: 0
  },
});
```

---

### Fase 3: Edge Function - Aceitar imageUrl

**Arquivo:** `supabase/functions/runninghub-upscaler/index.ts`

**Mudanças na função `handleRun` (linha 143+):**

```typescript
async function handleRun(req: Request) {
  // ...existing validation...
  
  const { 
    jobId, 
    imageUrl,        // NOVO: URL da imagem no Storage
    fileName,        // DEPRECADO: manter para compatibilidade temporária
    detailDenoise,
    resolution,
    prompt,
    version,
    framingMode,
    userId,
    creditCost
  } = await req.json();
  
  // Determinar qual usar: imageUrl (novo) ou fileName (legado)
  let rhFileName = fileName;
  
  if (imageUrl && !fileName) {
    // NOVO: Baixar imagem da URL e fazer upload para RunningHub
    console.log('[RunningHub] Downloading image from:', imageUrl);
    
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to download image from storage');
    }
    
    const imageBlob = await imageResponse.blob();
    const imageName = imageUrl.split('/').pop() || 'image.png';
    
    const formData = new FormData();
    formData.append('apiKey', RUNNINGHUB_API_KEY);
    formData.append('fileType', 'image');
    formData.append('file', imageBlob, imageName);
    
    const uploadResponse = await fetch('https://www.runninghub.ai/task/openapi/upload', {
      method: 'POST',
      body: formData,
    });
    
    const uploadData = await uploadResponse.json();
    if (uploadData.code !== 0) {
      throw new Error('RunningHub upload failed: ' + uploadData.msg);
    }
    
    rhFileName = uploadData.data.fileName;
    console.log('[RunningHub] Uploaded to RH, fileName:', rhFileName);
  }
  
  // Continuar com o processamento usando rhFileName...
}
```

---

### Fase 4: Remover Endpoint /upload (Opcional - Limpeza)

Após migração completa, o endpoint `/upload` pode ser removido ou simplificado:

```typescript
if (path === 'upload') {
  // DEPRECADO: Retornar erro informativo
  return new Response(JSON.stringify({ 
    error: 'Endpoint deprecated. Use direct storage upload + imageUrl.',
    code: 'DEPRECATED'
  }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

---

## Arquivos a Modificar

| Arquivo | Mudança | Prioridade |
|---------|---------|------------|
| `src/pages/UpscalerArcanoTool.tsx` | Upload direto Storage + enviar imageUrl | 🔴 CRÍTICA |
| `src/pages/UpscalerArcanoV3.tsx` | Remover upload duplicado, usar imageUrl | 🔴 CRÍTICA |
| `supabase/functions/runninghub-upscaler/index.ts` | Aceitar imageUrl, baixar internamente | 🔴 CRÍTICA |

---

## Economia Estimada

| Problema | Custo Atual | Custo Após |
|----------|-------------|------------|
| Base64 UpscalerTool | ~$3-5/2dias | ~$0.50 |
| Upload Duplo V3 | ~$2-4/2dias | $0 |
| **TOTAL ADICIONAL** | **~$5-9/2dias** | **~$0.50** |

**Combinado com correções anteriores (polling):**
- Custo original: ~$17/2dias
- Após correções de polling: ~$8-10/2dias
- Após correções de upload: ~$1-3/2dias

**Economia total projetada: 85-95%**

---

## Fluxo Otimizado Final

```
ANTES (caro):
┌─────────────────────────────────────────────────────────────────┐
│ Usuário → Base64 (+33%) → Edge Function → Decodifica → RunningHub │
│           $$$  bandwidth    $$ compute                           │
└─────────────────────────────────────────────────────────────────┘

DEPOIS (econômico):
┌─────────────────────────────────────────────────────────────────┐
│ Usuário → Storage (binário) → Edge Function → fetch URL → RH    │
│           GRÁTIS              $ mínimo                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Validação Pós-Implementação

1. Testar upload no UpscalerArcanoTool
2. Testar upload no UpscalerArcanoV3
3. Verificar logs de Edge Function (devem mostrar "Downloading image from:")
4. Monitorar consumo Cloud por 24h

