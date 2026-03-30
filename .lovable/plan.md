

# Plano: Corrigir filtro de categoria da biblioteca MovieLed

## Problema
A query no `MovieLedLibraryModal.tsx` filtra por `.eq('category', 'movies-para-telao')` (formato slug), mas no banco de dados a categoria real é `'Movies para Telão'` (com espaços, maiúsculas e acento). Resultado: 0 itens retornados.

## Correção
**Arquivo**: `src/components/movieled-maker/MovieLedLibraryModal.tsx` (linha 72)

Trocar:
```typescript
.eq('category', 'movies-para-telao')
```
Por:
```typescript
.eq('category', 'Movies para Telão')
```

Uma linha. Isso resolve o problema.

## Detalhes técnicos confirmados
- A tabela `admin_prompts` tem 30+ registros com `category = 'Movies para Telão'`
- Cada item tem `reference_images` com a imagem de referência (webp/jpg/png) que é usada como input no RunningHub (nó `image`)
- O `image_url` é o `.mp4` (vídeo de preview)
- O `thumbnail_url` é o webp para thumbnail
- A lógica de `getEffectiveImageUrl()` no `MovieLedMakerTool.tsx` já pega `reference_images[0]` corretamente para enviar ao backend

