

# Corrigir "Minhas Criações" para incluir Gerar Imagem e Gerar Vídeo

## Problema encontrado

A RPC `get_user_ai_creations` **nao inclui** as tabelas `image_generator_jobs` e `video_generator_jobs`. A migração anterior não aplicou corretamente as alterações na função. Por isso, as criações dessas ferramentas nunca aparecem.

O job gerado (`783fe65b`) existe no banco com `status: completed` e `output_url` preenchida, mas a função simplesmente não consulta essa tabela.

## Solução

Criar uma nova migração SQL que faz `CREATE OR REPLACE FUNCTION get_user_ai_creations` adicionando dois blocos `UNION ALL` ao final (antes do fechamento do CTE):

1. **image_generator_jobs** - ferramenta "Gerar Imagem", media_type = 'image', expiração de 24h
2. **video_generator_jobs** - ferramenta "Gerar Vídeo", media_type = 'video', expiração de 24h

Tambem atualizar a RPC `delete_user_ai_creation` para permitir exclusão dessas tabelas.

## Detalhes Tecnicos

### Migração SQL

Recriar a função `get_user_ai_creations` com os blocos adicionais:

```sql
UNION ALL
-- Gerar Imagem (Google Gemini)
SELECT igj.id, igj.output_url, NULL::TEXT as thumbnail_url,
  'Gerar Imagem'::TEXT as tool_name, 'image'::TEXT as media_type, igj.created_at,
  (igj.completed_at + interval '24 hours') as expires_at
FROM image_generator_jobs igj
WHERE igj.user_id = auth.uid() AND igj.status = 'completed' AND igj.output_url IS NOT NULL
  AND (igj.completed_at + interval '24 hours') > now()

UNION ALL
-- Gerar Vídeo (Google Veo)
SELECT vgj.id, vgj.output_url, NULL::TEXT as thumbnail_url,
  'Gerar Vídeo'::TEXT as tool_name, 'video'::TEXT as media_type, vgj.created_at,
  (vgj.completed_at + interval '24 hours') as expires_at
FROM video_generator_jobs vgj
WHERE vgj.user_id = auth.uid() AND vgj.status = 'completed' AND vgj.output_url IS NOT NULL
  AND (vgj.completed_at + interval '24 hours') > now()
```

Tambem atualizar `delete_user_ai_creation` adicionando:

```sql
ELSIF EXISTS (SELECT 1 FROM image_generator_jobs WHERE id = p_creation_id AND user_id = auth.uid()) THEN
  DELETE FROM image_generator_jobs WHERE id = p_creation_id AND user_id = auth.uid();
  RETURN true;
ELSIF EXISTS (SELECT 1 FROM video_generator_jobs WHERE id = p_creation_id AND user_id = auth.uid()) THEN
  DELETE FROM video_generator_jobs WHERE id = p_creation_id AND user_id = auth.uid();
  RETURN true;
```

### Nenhuma alteração no frontend

O frontend (`useMyCreations.ts`, `MyCreationsModal.tsx`) já está preparado para receber os dados -- o problema é puramente no banco de dados.

