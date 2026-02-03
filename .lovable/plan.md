
# Correção: Política RLS de Storage para Video Upscaler

## Problema Identificado

O erro "new row violates row-level security policy" ocorre ao fazer **upload do vídeo para o Storage**, não na tabela `video_upscaler_jobs`.

### Causa Raiz

| Código (VideoUpscalerTool.tsx:227) | Política de Storage existente |
|------------------------------------|-----------------------------|
| `video-upscaler/${user.id}/...` | Só permite `upscaler/` |

A política atual só permite uploads na pasta `upscaler/`:
```sql
WITH CHECK: bucket_id = 'artes-cloudinary' AND foldername(name)[1] = 'upscaler'
```

Mas o código está tentando fazer upload na pasta `video-upscaler/`:
```typescript
const filePath = `video-upscaler/${user.id}/${fileName}`;
```

---

## Solução

Criar uma nova política de storage que permita uploads na pasta `video-upscaler/`:

```sql
CREATE POLICY "Authenticated users can upload to video-upscaler folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'artes-cloudinary' 
  AND (storage.foldername(name))[1] = 'video-upscaler'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
```

Essa política segue o mesmo padrão da pasta `pose-changer/`, garantindo que:
- Só usuários autenticados podem fazer upload
- Cada usuário só pode fazer upload na sua própria subpasta

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| Nova migração SQL | Criar política de storage para `video-upscaler/` |

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Upload falha com erro de RLS | Upload funciona normalmente |
| Interface mostra "Erro no processamento" | Processamento continua sem erros |
