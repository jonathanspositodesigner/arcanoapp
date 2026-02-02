
## Objetivo
Corrigir o erro “new row violates row-level security policy” no Pose Changer, que está acontecendo **no upload das imagens para o armazenamento** (não é a fila, nem o job na tabela).

## Diagnóstico (o que está acontecendo)
- O log mostra `StorageApiError: new row violates row-level security policy` ao tentar fazer `upload()` para:
  - bucket: `artes-cloudinary`
  - caminho: `pose-changer/person-....webp`
- Hoje existe uma policy explícita permitindo upload **apenas** para a pasta `upscaler/` dentro desse bucket:
  - `Authenticated users can upload to upscaler folder`
- Como o Pose Changer faz upload em `pose-changer/`, o backend bloqueia com 403.

Isso **não é por estar no preview**. O preview só está mostrando o erro; a causa é a regra de permissão do armazenamento.

---

## Solução proposta
Adicionar uma policy de upload para a pasta `pose-changer/` (seguindo o mesmo padrão da pasta `upscaler/`) para permitir que usuários autenticados consigam enviar os arquivos.

### Opção recomendada (mais segura)
Além de liberar `pose-changer/`, organizar o caminho por usuário:
- De: `pose-changer/person-...`
- Para: `pose-changer/<user_id>/person-...`

E criar a policy exigindo que a 2ª pasta seja o próprio `auth.uid()`. Isso reduz risco de um usuário sobrescrever/atacar arquivos de outro usuário.

---

## Passos de implementação

### 1) Backend (migração SQL): liberar upload para Pose Changer
Criar uma nova migração em `supabase/migrations/*` adicionando policies em `storage.objects`:

- `INSERT` para usuários autenticados no bucket `artes-cloudinary`
- Restringindo a pasta `pose-changer`
- (Recomendado) Restringindo também a subpasta do usuário

Exemplo (recomendado):

```sql
-- Permitir usuários autenticados fazer upload na pasta pose-changer/<user_id>/
CREATE POLICY "Authenticated users can upload to pose-changer folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'artes-cloudinary'
  AND (storage.foldername(name))[1] = 'pose-changer'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
```

Opcional (robustez por causa do `upsert: true` no client): policy de UPDATE também, para cobrir cenários de re-upload do mesmo caminho:

```sql
CREATE POLICY "Authenticated users can update pose-changer folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'artes-cloudinary'
  AND (storage.foldername(name))[1] = 'pose-changer'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'artes-cloudinary'
  AND (storage.foldername(name))[1] = 'pose-changer'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
```

### 2) Frontend: ajustar o caminho do upload para bater com a policy
Editar `src/pages/PoseChangerTool.tsx` na função `uploadToStorage`:

- De:
  - `const filePath = \`pose-changer/${fileName}\`;`
- Para:
  - `const filePath = \`pose-changer/${user.id}/${fileName}\`;`

Também garantir fallback seguro:
- Se `!user?.id`, lançar erro (mas isso já está bloqueado no `handleProcess`).

### 3) Teste rápido (critério de aceite)
No `/pose-changer-tool`:
1. Escolher “Sua Foto” e “Referência”
2. Clicar “Gerar Pose”
3. Validar no console/network:
   - O request `POST .../storage/v1/object/artes-cloudinary/...` deve voltar 200 (ou 201), não 403
4. Confirmar que:
   - O job é criado
   - A chamada `runninghub-pose-changer/run` acontece
   - A fila/processamento segue normalmente

---

## Observações
- A policy de “Public read access” para `artes-cloudinary` já existe, então a função backend continua conseguindo baixar a imagem via URL pública.
- Essa correção é específica do upload. A fila global de 3 simultâneos continua válida e separada desse problema.

---

## Arquivos envolvidos
- Backend: nova migração SQL em `supabase/migrations/*` (policies em `storage.objects`)
- Frontend: `src/pages/PoseChangerTool.tsx` (ajuste do `filePath` do upload)
