

## Correcao: Politica de Storage para o Gerador de Avatar

### Por que funcionava antes?

O Gerador de Avatar faz upload para a pasta `character-generator/{user_id}/` no bucket `artes-cloudinary`. Verificando as politicas existentes, **nunca existiu** uma politica de INSERT para essa pasta. As unicas politicas de INSERT sao para:
- `upscaler/`
- `pose-changer/{user_id}/`
- `veste-ai/{user_id}/`
- `video-upscaler/{user_id}/`
- Admins (qualquer pasta)

Isso significa que provavelmente o recurso foi testado com uma conta admin (que tem permissao total via "Admins can upload to artes-cloudinary") e por isso parecia funcionar. Usuarios normais nunca tiveram permissao.

### Solucao

Adicionar uma unica politica de INSERT no `storage.objects` para permitir que usuarios autenticados facam upload na pasta `character-generator/{seu_user_id}/`:

```text
Bucket: artes-cloudinary
Pasta: character-generator/{auth.uid()}/
Operacao: INSERT
Quem: usuarios autenticados (somente na propria pasta)
```

### Implementacao

Uma migracao SQL com:

```sql
CREATE POLICY "Authenticated users can upload to character-generator folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artes-cloudinary'
  AND (storage.foldername(name))[1] = 'character-generator'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND auth.uid() IS NOT NULL
);
```

### Arquivos

| Arquivo | Acao |
|---------|------|
| Migracao SQL | 1 politica de INSERT no storage.objects |

Nenhum arquivo de codigo precisa ser alterado. O problema e exclusivamente de permissao no Storage.

