
# Corrigir "Antes e Depois" no Pose Changer e Veste AI

## Problema
Mesma situacao do Upscaler que acabamos de corrigir: o insert dos jobs no banco salva apenas o **nome do arquivo** (`person_file_name`) mas nao salva a **URL publica** (`person_image_url`). O campo existe na tabela mas fica sempre NULL.

## Sobre o Storage 24h
Sim, o `cleanup-ai-storage` remove arquivos com mais de 24h de TODAS as ferramentas de IA (upscaler, pose-changer, veste-ai, arcano-cloner, character-generator, flyer-maker, video-upscaler, image-generator, video-generator). Isso significa que as imagens "antes" precisam estar salvas como URL no banco, porque o arquivo no storage sera apagado.

## Solucao

### Arquivo 1: `src/pages/PoseChangerTool.tsx` (linha ~359)

Adicionar `person_image_url: personUrl` no insert do job:

```typescript
const { data: job, error: jobError } = await supabase
  .from('pose_changer_jobs')
  .insert({
    session_id: sessionIdRef.current,
    user_id: user.id,
    status: 'pending',
    person_file_name: personUrl.split('/').pop() || 'person.webp',
    reference_file_name: referenceUrl.split('/').pop() || 'reference.webp',
    person_image_url: personUrl,       // NOVO - salva URL da pessoa
    reference_image_url: referenceUrl, // NOVO - salva URL da referencia
  })
```

### Arquivo 2: `src/pages/VesteAITool.tsx` (linha ~359)

Adicionar `person_image_url: personUrl` no insert do job:

```typescript
const { data: job, error: jobError } = await supabase
  .from('veste_ai_jobs')
  .insert({
    session_id: sessionIdRef.current,
    user_id: user.id,
    status: 'pending',
    person_file_name: personUrl.split('/').pop() || 'person.webp',
    clothing_file_name: clothingUrl.split('/').pop() || 'clothing.webp',
    person_image_url: personUrl,     // NOVO - salva URL da pessoa
    clothing_image_url: clothingUrl, // NOVO - salva URL da roupa
  })
```

### Nenhuma alteracao no backend/banco
As colunas `person_image_url`, `reference_image_url` e `clothing_image_url` ja existem nas tabelas. So precisam ser preenchidas no insert.

### Importante
Assim como no Upscaler, essa correcao so vale para **novos jobs**. Jobs antigos continuarao sem a imagem "antes" porque o dado nunca foi salvo.
