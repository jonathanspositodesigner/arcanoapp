

## Centralizar "Minhas Criações" para TODAS as ferramentas de IA (presente e futuras)

### Problema

A RPC `get_user_ai_creations` não inclui `arcano_cloner_jobs`, então resultados do Arcano Cloner não aparecem em "Minhas Criações". Além disso, a função `cleanup_expired_ai_jobs` está faltando `arcano_cloner_jobs` e `character_generator_jobs`.

### Solução

Uma única migração SQL que atualiza as duas funções para incluir TODAS as 6 tabelas de jobs existentes, com comentários claros indicando onde adicionar futuras ferramentas.

### O que será feito

**Migração SQL única** que recria as duas funções:

**1. `get_user_ai_creations`** - Adicionar UNION ALL para:
- `arcano_cloner_jobs` (tool_name: 'Arcano Cloner', media_type: 'image')

Tabelas já incluídas que permanecem:
- `upscaler_jobs` (Upscaler Arcano)
- `pose_changer_jobs` (Pose Changer)
- `veste_ai_jobs` (Veste AI)
- `video_upscaler_jobs` (Video Upscaler)
- `character_generator_jobs` (Gerador Avatar)

**2. `cleanup_expired_ai_jobs`** - Adicionar DELETE para:
- `arcano_cloner_jobs`
- `character_generator_jobs`

O retorno será atualizado para incluir as contagens das novas tabelas.

### Detalhes técnicos

Ambas as funções seguem o mesmo padrão: verificam `status = 'completed'`, `output_url IS NOT NULL`, e `completed_at + interval '5 days'`.

```text
-- Padrão para cada tabela em get_user_ai_creations:
SELECT id, output_url, thumbnail_url, 
       'Nome da Ferramenta'::TEXT, 'image'::TEXT, 
       created_at, (completed_at + interval '5 days')
FROM tabela_jobs 
WHERE user_id = auth.uid() 
  AND status = 'completed' 
  AND output_url IS NOT NULL 
  AND (completed_at + interval '5 days') > now()

-- Padrão para cada tabela em cleanup_expired_ai_jobs:
DELETE FROM tabela_jobs
WHERE status = 'completed'
  AND completed_at IS NOT NULL
  AND (completed_at + interval '5 days') < now()
```

### Arquivos

| Arquivo | Alteração |
|---------|-----------|
| Nova migração SQL | Recriar `get_user_ai_creations` e `cleanup_expired_ai_jobs` com todas as 6 tabelas |

Nenhum arquivo frontend precisa mudar -- o hook `useMyCreations` já chama a RPC e renderiza o resultado automaticamente.

