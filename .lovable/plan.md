
# Plano: Correção dos Bugs na Ferramenta Veste AI

## Diagnóstico

Foram identificados **dois bugs** distintos na ferramenta Veste AI:

### Bug 1: Erro "new row violates row-level security policy"
**Causa:** Falta de política de Storage RLS para a pasta `veste-ai/` no bucket `artes-cloudinary`.

O sistema possui políticas de upload para:
- `pose-changer/` ✅
- `upscaler/` ✅  
- `video-upscaler/` ✅
- `veste-ai/` ❌ **FALTANDO**

Quando o usuário tenta enviar imagens, o sistema tenta salvar em `artes-cloudinary/veste-ai/{user_id}/`, mas não existe permissão RLS para isso.

### Bug 2: Upload não funciona ao "Tentar Novamente"
**Causa:** O componente `ImageUploadCard.tsx` não reseta o campo de input após a seleção de arquivo.

Quando ocorre um erro e o usuário clica em "Tentar Novamente", se ele tentar selecionar a **mesma imagem**, o navegador não dispara o evento `onChange` porque o valor do input ainda contém a referência ao arquivo anterior.

**Comparação:**
- `VideoUploadCard.tsx` (linha 218): tem `e.target.value = ''` ✅
- `ImageUploadCard.tsx`: **não tem** essa linha ❌

---

## Solução Proposta

### Correção 1: Adicionar Política de Storage RLS

Criar uma nova migração SQL que adiciona as políticas de INSERT e UPDATE para a pasta `veste-ai/`:

```text
-- Permitir usuários autenticados fazer upload para veste-ai/<user_id>/
CREATE POLICY "Authenticated users can upload to veste-ai folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'artes-cloudinary'
  AND (storage.foldername(name))[1] = 'veste-ai'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Permitir update (para upsert)
CREATE POLICY "Authenticated users can update veste-ai folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'artes-cloudinary'
  AND (storage.foldername(name))[1] = 'veste-ai'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'artes-cloudinary'
  AND (storage.foldername(name))[1] = 'veste-ai'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
```

### Correção 2: Resetar Input no ImageUploadCard

Adicionar o reset do valor do input no componente `ImageUploadCard.tsx`:

```text
Arquivo: src/components/pose-changer/ImageUploadCard.tsx
Linha: 64-67

Antes:
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

Depois:
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    // Reset input value to allow re-selecting the same file
    e.target.value = '';
  }, [handleFileSelect]);
```

---

## Arquivos a Modificar

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `supabase/migrations/XXXX_veste_ai_storage_policy.sql` | NOVO | Política de Storage RLS para pasta veste-ai |
| `src/components/pose-changer/ImageUploadCard.tsx` | EDIÇÃO | Adicionar reset do input |

---

## Impacto

- **Pose Changer:** Também será beneficiado pela correção do ImageUploadCard (usam o mesmo componente)
- **Veste AI:** Funcionará normalmente após a aplicação da política de storage
- **Sem breaking changes:** As alterações são aditivas e não afetam funcionalidades existentes

---

## Resumo Técnico

```text
Bug 1 (RLS):
  Causa: storage.objects não permite INSERT em veste-ai/{user_id}/
  Correção: Criar policy idêntica à do pose-changer

Bug 2 (Re-upload):
  Causa: input[type=file].value não é resetado após seleção
  Correção: e.target.value = '' após handleFileSelect()
```
