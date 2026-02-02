
# Plano: Corrigir Erro de RLS no Upload do Upscaler Arcano

## Problema Identificado

O erro "new row violates row-level security policy" ocorre porque:

1. O bucket de storage `artes-cloudinary` só permite **admins** fazerem upload (INSERT)
2. O Upscaler Arcano Tool tenta fazer upload de imagens para `artes-cloudinary/upscaler/` com usuários autenticados normais
3. Como o usuário não é admin, o upload falha com erro de RLS

### Política Atual (Restritiva)
```sql
-- Apenas admins podem fazer upload
CREATE POLICY "Admins can upload to artes-cloudinary"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artes-cloudinary' 
  AND has_role(auth.uid(), 'admin'::app_role)
);
```

---

## Solução Proposta

Adicionar uma nova política RLS que permite usuários autenticados fazerem upload **apenas na pasta `upscaler/`** do bucket `artes-cloudinary`.

### Migração SQL

```sql
-- Permitir usuários autenticados fazer upload na pasta upscaler/
CREATE POLICY "Authenticated users can upload to upscaler folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'artes-cloudinary' 
  AND (storage.foldername(name))[1] = 'upscaler'
);
```

Esta política:
- Aplica-se apenas a usuários **autenticados**
- Permite upload **apenas** na pasta `upscaler/`
- Não afeta outras pastas do bucket (admin-only)
- Mantém a segurança do restante do bucket

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| Nova migração SQL | Criar política de storage para pasta upscaler |

---

## Detalhes Técnicos

### Fluxo Atual do Upscaler
1. Frontend cria job em `upscaler_jobs` ✅
2. Frontend faz upload da imagem para `artes-cloudinary/upscaler/{job.id}.ext` ❌ **FALHA AQUI**
3. Edge function processa o job com RunningHub
4. Webhook atualiza o resultado

### Após a Correção
O passo 2 funcionará porque usuários autenticados terão permissão de upload na pasta específica `upscaler/`.

---

## Considerações de Segurança

- A nova política é **restritiva** - só permite uploads na pasta `upscaler/`
- Outras pastas do bucket continuam protegidas (apenas admins)
- Usuários anônimos (não logados) não podem fazer upload
- O path inclui o job ID, dificultando conflitos/abuso
