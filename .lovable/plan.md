
# Plano: Thumbnails Persistentes para "Minhas Criações"

## Diagnóstico do Problema

As imagens na seção "Minhas Criações" estão aparecendo como **vazias** porque:

1. As URLs de saída são do RunningHub CDN (servidor na China): `rh-images-1252422369.cos.ap-beijing.myqcloud.com`
2. Este servidor **bloqueia CORS** - o navegador não consegue carregar as imagens diretamente
3. As imagens existem (confirmei fazendo fetch server-side), mas o `<img>` do navegador falha silenciosamente

## Solução: Sistema de Thumbnails Persistentes

Quando um job é completado com sucesso, o sistema vai:

1. Gerar uma **thumbnail comprimida** (300px, WebP, ~15KB)
2. Salvar no **nosso Storage** (domínio com CORS correto)
3. Guardar a URL da thumbnail no banco de dados
4. Usar a thumbnail para preview, mantendo URL original para download

---

## Arquitetura

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FLUXO DE THUMBNAIL                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Job Completo (webhook recebido)                                           │
│       │                                                                     │
│       ▼                                                                     │
│  [runninghub-webhook] → [runninghub-queue-manager /finish]                 │
│                                │                                            │
│                                ▼                                            │
│                    Detecta: outputUrl presente                              │
│                                │                                            │
│                                ▼                                            │
│              Chama: generate-thumbnail Edge Function                       │
│                                │                                            │
│                                ▼                                            │
│           Fetch server-side + Compress + Upload Storage                    │
│                                │                                            │
│                                ▼                                            │
│        Atualiza job.thumbnail_url com URL do nosso domínio                │
│                                │                                            │
│                                ▼                                            │
│  [Minhas Criações] → Usa thumbnail_url (funciona no navegador!)           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Mudanças Técnicas

### 1. CRIAR: Bucket de Storage para Thumbnails

```sql
-- Bucket público para thumbnails de criações IA
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-thumbnails', 'ai-thumbnails', true);

-- RLS: Qualquer usuário autenticado pode ver thumbnails públicas
CREATE POLICY "Thumbnails públicas para leitura"
ON storage.objects FOR SELECT
USING (bucket_id = 'ai-thumbnails');

-- RLS: Apenas service role pode inserir (via Edge Function)
CREATE POLICY "Service role pode inserir thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ai-thumbnails' AND auth.role() = 'service_role');
```

### 2. ADICIONAR: Coluna `thumbnail_url` nas tabelas de jobs

```sql
-- Adicionar coluna thumbnail_url em todas as tabelas de jobs
ALTER TABLE upscaler_jobs ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE pose_changer_jobs ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE veste_ai_jobs ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE video_upscaler_jobs ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
```

### 3. CRIAR: Edge Function `generate-thumbnail`

Nova função que:
- Recebe URL da imagem + job ID + tabela
- Faz fetch server-side (bypassa CORS)
- Comprime para 300px WebP (~15KB)
- Faz upload para `ai-thumbnails/{table}/{jobId}.webp`
- Atualiza o job com `thumbnail_url`

```typescript
// supabase/functions/generate-thumbnail/index.ts
serve(async (req) => {
  const { imageUrl, jobId, table, userId } = await req.json();
  
  // 1. Fetch imagem (server-side, sem CORS)
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  
  // 2. Comprimir para 300px WebP (usando sharp ou canvas)
  const thumbnail = await compressImage(blob, 300);
  
  // 3. Upload para Storage
  const path = `${table}/${jobId}.webp`;
  await supabase.storage.from('ai-thumbnails').upload(path, thumbnail);
  
  // 4. Gerar URL pública
  const thumbnailUrl = `${SUPABASE_URL}/storage/v1/object/public/ai-thumbnails/${path}`;
  
  // 5. Atualizar job
  await supabase.from(table).update({ thumbnail_url: thumbnailUrl }).eq('id', jobId);
  
  return { success: true, thumbnailUrl };
});
```

### 4. MODIFICAR: `runninghub-queue-manager` /finish

Adicionar chamada para gerar thumbnail quando job completa com sucesso:

```typescript
// Após atualizar o job com outputUrl
if (status === 'completed' && outputUrl) {
  try {
    // Chamar Edge Function de thumbnail (assíncrono, não bloqueia)
    fetch(`${SUPABASE_URL}/functions/v1/generate-thumbnail`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` 
      },
      body: JSON.stringify({ 
        imageUrl: outputUrl, 
        jobId, 
        table,
        userId: job.user_id 
      })
    }).catch(e => console.error('[QueueManager] Thumbnail generation failed:', e));
  } catch (e) {
    // Não bloquear se falhar - thumbnail é nice-to-have
    console.error('[QueueManager] Error triggering thumbnail:', e);
  }
}
```

### 5. ATUALIZAR: RPC `get_user_ai_creations`

Incluir `thumbnail_url` no retorno:

```sql
CREATE OR REPLACE FUNCTION public.get_user_ai_creations(...)
RETURNS TABLE (
  id UUID,
  output_url TEXT,
  thumbnail_url TEXT,  -- NOVO
  tool_name TEXT,
  media_type TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
-- ... seleções com uj.thumbnail_url para cada UNION
```

### 6. ATUALIZAR: `CreationCard.tsx`

Usar `thumbnail_url` para preview quando disponível:

```tsx
// Usar thumbnail para preview, output_url para download
const previewUrl = creation.thumbnail_url || creation.output_url;

<img
  src={previewUrl}
  alt={`Criação ${creation.tool_name}`}
  className="w-full h-full object-contain"
  loading="lazy"
  onError={() => setImageError(true)}
/>
```

### 7. ATUALIZAR: Interface `Creation` no hook

```typescript
export interface Creation {
  id: string;
  output_url: string;
  thumbnail_url: string | null;  // NOVO
  tool_name: string;
  media_type: 'image' | 'video';
  created_at: string;
  expires_at: string;
}
```

### 8. LIMPEZA AUTOMÁTICA

As thumbnails seguem a mesma lógica de expiração de 5 dias. Podemos criar um cron job ou trigger para limpar:

```sql
-- Função para limpar thumbnails expiradas (pode ser chamada periodicamente)
CREATE OR REPLACE FUNCTION cleanup_expired_thumbnails()
RETURNS void AS $$
BEGIN
  -- Deleta do storage os arquivos de jobs expirados
  -- (implementação depende de como queremos fazer a limpeza)
END;
$$ LANGUAGE plpgsql;
```

---

## Arquivos Modificados/Criados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/generate-thumbnail/index.ts` | **CRIAR** | Edge Function para gerar thumbnails |
| `supabase/functions/runninghub-queue-manager/index.ts` | **MODIFICAR** | Chamar generate-thumbnail após job completar |
| `supabase/config.toml` | **MODIFICAR** | Adicionar config do generate-thumbnail |
| `src/components/ai-tools/creations/CreationCard.tsx` | **MODIFICAR** | Usar thumbnail_url para preview |
| `src/components/ai-tools/creations/useMyCreations.ts` | **MODIFICAR** | Adicionar thumbnail_url à interface |
| Migration SQL | **CRIAR** | Bucket + colunas thumbnail_url + RPC atualizada |

---

## Por Que Funciona?

| Problema Atual | Solução |
|----------------|---------|
| CORS bloqueia imagem no `<img>` | Thumbnail serve do nosso domínio (CORS OK) |
| Imagens grandes no preview | Thumbnails de 300px (~15KB) carregam instantâneo |
| Download precisa de URL original | `output_url` continua intacta para download HD |

---

## Garantias de Segurança

| Item | Status |
|------|--------|
| Edge Functions existentes | ✅ Apenas ADICIONA código no /finish |
| Webhooks de pagamento | ✅ INTOCADOS |
| Banco de dados | ✅ Apenas ADICIONA colunas (não altera existentes) |
| Créditos | ✅ INTOCADO |
| Performance | ✅ Thumbnail gerada async (não bloqueia webhook) |
| Storage | ✅ Bucket separado com RLS correto |

---

## Benefícios Extras

1. **Carregamento ultra-rápido** - Thumbnails de ~15KB vs imagens de 10MB+
2. **Menos uso de banda do RunningHub** - Preview não depende do CDN da China
3. **Mais confiável** - Se RunningHub estiver lento, preview ainda funciona
4. **Experiência mobile** - Imagens leves = interface fluida
