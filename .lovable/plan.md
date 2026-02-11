

## Correcao: RLS bloqueando upload no Arcano Cloner

### Problema

O Arcano Cloner faz upload de imagens para a pasta `arcano-cloner/{user_id}/` no bucket `artes-cloudinary`, mas nao existe nenhuma politica de Storage RLS permitindo esse upload. As politicas existentes cobrem apenas:

| Pasta | Politica existe? |
|-------|-----------------|
| `character-generator/{user_id}/` | Sim |
| `pose-changer/{user_id}/` | Sim |
| `veste-ai/{user_id}/` | Sim |
| `video-upscaler/{user_id}/` | Sim |
| `upscaler/` | Sim |
| `reference/` | Sim |
| `user/` | Sim |
| `arcano-cloner/{user_id}/` | **NAO - FALTANDO** |

Por isso, qualquer usuario nao-admin recebe "new row violates row-level security policy" ao tentar gerar no Arcano Cloner.

### Solucao

Criar uma politica de INSERT no Storage para a pasta `arcano-cloner/{user_id}/`, seguindo o mesmo padrao das outras ferramentas (pose-changer, veste-ai, video-upscaler):

```text
CREATE POLICY "Authenticated users can upload to arcano-cloner folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artes-cloudinary'
  AND (storage.foldername(name))[1] = 'arcano-cloner'
  AND (storage.foldername(name))[2] = (auth.uid())::text
  AND auth.uid() IS NOT NULL
);
```

### Mudanca

| Tipo | Detalhe |
|------|---------|
| Migration SQL | Criar 1 politica de Storage RLS para pasta `arcano-cloner/` |

Nenhum arquivo de codigo precisa ser alterado. O problema e exclusivamente de politica de banco de dados.

