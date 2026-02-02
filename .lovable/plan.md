
# Plano Completo: Correção do Consumo Excessivo de Cloud ($17+ em 2 dias)

## Diagnóstico Detalhado

### 🚨 Problemas Críticos Identificados

| # | Problema | Arquivo(s) | Impacto Estimado |
|---|----------|------------|------------------|
| 1 | **Polling Bugado V3** | `UpscalerArcanoV3.tsx` | ~$4-6 (milhares de 400 errors) |
| 2 | **Polling Runpod** | `UpscalerRunpod.tsx` | ~$2-4 (invocações a cada 5s) |
| 3 | **Upload Base64** | Todas as ferramentas | ~$3-5 (bandwidth 33% overhead) |
| 4 | **Loop N+1 Webhook** | `runninghub-webhook/index.ts` | ~$1-2 (múltiplos UPDATEs) |
| 5 | **Polling Redundante** | `AguardandoPagamentoMusicos.tsx` | ~$0.50-1 (leituras desnecessárias) |

---

## Correções a Implementar

### 1. Migrar UpscalerArcanoV3 para Realtime (CRÍTICO)

**Problema:** O V3 faz polling a cada 5 segundos chamando a Edge Function com `action: 'status'`, mas a função não reconhece essa action → erros 400 constantes.

**Solução:** Migrar para o mesmo padrão do `UpscalerArcanoTool.tsx`:
- Salvar job na tabela `upscaler_jobs`
- Usar Supabase Realtime para monitorar mudanças
- Eliminar completamente o `setInterval`

**Arquivo:** `src/pages/UpscalerArcanoV3.tsx`

**Mudanças:**
```typescript
// REMOVER: Polling loop (linhas 168-267)
pollingRef.current = setInterval(async () => { ... }, 5000);

// ADICIONAR: Realtime subscription (mesmo padrão do UpscalerArcanoTool)
useEffect(() => {
  if (!jobId) return;
  
  const channel = supabase
    .channel(`upscaler-job-${jobId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'upscaler_jobs',
      filter: `id=eq.${jobId}`
    }, (payload) => {
      // Processar update
    })
    .subscribe();
    
  return () => supabase.removeChannel(channel);
}, [jobId]);
```

---

### 2. Migrar UpscalerRunpod para Realtime

**Problema:** Idêntico ao V3 - polling a cada 5 segundos.

**Solução:** Se o Runpod for mantido:
- Implementar webhook callback no Runpod
- Usar tabela `upscaler_jobs` com campo `provider = 'runpod'`
- Realtime para atualizar UI

**Arquivo:** `src/pages/UpscalerRunpod.tsx` + nova edge function `runpod-webhook`

**Ou solução alternativa:** Se Runpod não estiver em uso ativo, **desativar/remover** a página para evitar custos.

---

### 3. Upload Direto ao Supabase Storage (ALTA ECONOMIA)

**Problema Atual:**
```
Usuário → Base64 (1.33x maior) → Edge Function → Processa → RunningHub
```

**Solução:**
```
Usuário → Upload direto ao Storage (binário) → Edge Function recebe apenas URL
```

**Arquivos a modificar:**
- `src/pages/UpscalerArcanoTool.tsx`
- `src/pages/UpscalerArcanoV3.tsx`
- `src/pages/UpscalerRunpod.tsx`
- `supabase/functions/runninghub-upscaler/index.ts`

**Mudança no Frontend:**
```typescript
// ANTES (processImage function)
const base64Data = inputImage.split(',')[1];
const uploadResponse = await supabase.functions.invoke('runninghub-upscaler/upload', {
  body: { imageBase64: base64Data, fileName }
});

// DEPOIS
// 1. Converter base64 para File
const blob = await fetch(inputImage).then(r => r.blob());
const file = new File([blob], inputFileName, { type: blob.type });

// 2. Upload direto ao Supabase Storage (GRÁTIS, sem Edge Function)
const path = `upscaler/${crypto.randomUUID()}.${fileName.split('.').pop()}`;
const { data, error } = await supabase.storage
  .from('artes-cloudinary')
  .upload(path, file, { contentType: file.type });

// 3. Obter URL pública
const { data: urlData } = supabase.storage
  .from('artes-cloudinary')
  .getPublicUrl(path);

// 4. Enviar apenas URL para a Edge Function
const runResponse = await supabase.functions.invoke('runninghub-upscaler/run', {
  body: { imageUrl: urlData.publicUrl, jobId, ... }
});
```

**Economia:** Reduz bandwidth em ~33% e elimina tempo de computação na Edge Function para processamento de Base64.

---

### 4. Otimizar Loop N+1 no Webhook

**Problema Atual (linhas 258-263):**
```typescript
for (let i = 0; i < queuedJobs.length; i++) {
  await supabase.from('upscaler_jobs').update({ position: i + 1 }).eq('id', queuedJobs[i].id);
}
// 10 jobs na fila = 10 queries separadas
```

**Solução:** Uma única query SQL com `ROW_NUMBER()`

**Arquivo:** `supabase/functions/runninghub-webhook/index.ts`

**Nova implementação:**
```typescript
async function updateQueuePositions() {
  // Uma única query que atualiza todas as posições de uma vez
  const { error } = await supabase.rpc('update_queue_positions');
  if (error) console.error('[Webhook] Error updating positions:', error);
}
```

**Nova Database Function (migration):**
```sql
CREATE OR REPLACE FUNCTION update_queue_positions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE upscaler_jobs AS uj
  SET position = ranked.new_position
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS new_position
    FROM upscaler_jobs
    WHERE status = 'queued'
  ) AS ranked
  WHERE uj.id = ranked.id AND uj.status = 'queued';
END;
$$;
```

---

### 5. Remover Polling Redundante na Página de Pagamento

**Problema:** A página já usa Realtime (linhas 31-38), mas também tem um `setInterval` de 10 segundos (linha 45).

**Arquivo:** `src/pages/AguardandoPagamentoMusicos.tsx`

**Solução:** Remover o polling ou aumentar para 60 segundos (fallback apenas)

```typescript
// REMOVER ou MODIFICAR (linha 43-47):
useEffect(() => {
  if (!user?.id) return;
  // ANTES: 10 segundos
  // const interval = setInterval(() => { refetch(); }, 10000);
  
  // DEPOIS: 60 segundos como fallback apenas
  const interval = setInterval(() => { refetch(); }, 60000);
  return () => clearInterval(interval);
}, [user?.id, refetch]);
```

---

## Arquivos a Modificar

| Arquivo | Tipo de Mudança | Prioridade |
|---------|-----------------|------------|
| `src/pages/UpscalerArcanoV3.tsx` | Migrar polling → Realtime | 🔴 CRÍTICA |
| `src/pages/UpscalerRunpod.tsx` | Migrar polling → Realtime ou desativar | 🔴 CRÍTICA |
| `src/pages/UpscalerArcanoTool.tsx` | Upload direto ao Storage | 🟠 ALTA |
| `supabase/functions/runninghub-upscaler/index.ts` | Receber URL em vez de Base64 | 🟠 ALTA |
| `supabase/functions/runninghub-webhook/index.ts` | Otimizar loop N+1 | 🟡 MÉDIA |
| `src/pages/AguardandoPagamentoMusicos.tsx` | Aumentar intervalo de polling | 🟢 BAIXA |

---

## Economia Estimada Após Correções

| Problema | Custo Atual (2 dias) | Custo Após Correção |
|----------|---------------------|---------------------|
| Polling V3 bugado | ~$4-6 | $0 |
| Polling Runpod | ~$2-4 | $0 |
| Bandwidth Base64 | ~$3-5 | ~$1-2 |
| Loop N+1 webhook | ~$1-2 | ~$0.10 |
| Polling pagamento | ~$0.50-1 | ~$0.05 |
| **TOTAL** | **~$17+** | **~$1-3** |

**Economia projetada: 85-95% de redução no consumo de Cloud**

---

## Ordem de Implementação

1. **Fase 1 (Emergencial):** Corrigir polling bugado V3 e Runpod
2. **Fase 2 (Alto Impacto):** Migrar uploads para Storage direto
3. **Fase 3 (Otimização):** Webhook batch update + polling pagamento
4. **Fase 4 (Monitoramento):** Verificar métricas após 24h

---

## Decisão Necessária

Antes de implementar, preciso saber:

1. **UpscalerRunpod** está em uso ativo ou pode ser desativado/removido?
2. **UpscalerArcanoV3** está em uso ou é apenas experimental?

Se ambos forem experimentais/não-ativos, a correção mais rápida é simplesmente **desativar essas páginas** (remover rotas) enquanto mantemos apenas o `UpscalerArcanoTool.tsx` que já usa Realtime corretamente.
