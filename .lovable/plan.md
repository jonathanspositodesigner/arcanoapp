

# Migrar Refinamento do Arcano Cloner e Flyer Maker para RunningHub

## Problema
O refinamento do Arcano Cloner e Flyer Maker ainda usa a edge function `generate-image` que chama a API do Google Gemini. Precisa migrar para usar a mesma infraestrutura RunningHub (`runninghub-image-generator`) que a página Gerar Imagem já usa.

## Desafio Arquitetural
O fluxo atual de refinamento é **síncrono** (chama a API → espera → recebe resultado na mesma request). O RunningHub é **assíncrono** (cria job → entra na fila → webhook retorna resultado). Isso exige mudar a UX do refinamento para funcionar com o padrão de job queue.

## Plano

### 1. Adaptar o Frontend do Arcano Cloner (`ArcanoClonerTool.tsx`)
- Substituir a chamada `supabase.functions.invoke('generate-image')` pelo fluxo JobManager:
  1. Upload da imagem atual (output) + referência extra para o storage via `uploadToStorage`
  2. `checkActiveJob()` antes de iniciar
  3. `createJob('image_generator', ...)` para criar o job no banco
  4. `startJob('image_generator', ...)` para delegar ao queue manager
- Adicionar estado de processamento do refinamento (jobId, status) com `useJobStatusSync` para receber o resultado via Realtime
- Quando o resultado chegar via Realtime (status `completed` + `outputUrl`), atualizar o `outputImage` e o `refinementHistory`
- Custo fixo de 30 créditos (mantém o mesmo)

### 2. Adaptar o Frontend do Flyer Maker (`FlyerMakerTool.tsx`)
- Mesma lógica do passo 1, adaptada para o Flyer Maker
- Custo fixo de 30 créditos (mantém)

### 3. Ajustar a Edge Function `runninghub-image-generator`
- Adicionar suporte para o campo `source` no payload (`arcano_cloner_refine` / `flyer_maker_refine`)
- Quando `source` for refinamento, usar custo fixo de 30 créditos e descrição adequada (em vez do custo padrão de 100)
- O restante do fluxo (upload para RunningHub, delegação ao queue manager) permanece idêntico

### 4. Remover dependência da edge function `generate-image`
- Após a migração, verificar se `generate-image` ainda é usada em algum lugar
- Se não for mais usada por nenhuma ferramenta, pode ser removida (ou mantida como legacy)

## Detalhes Técnicos

### Fluxo do Refinamento (novo)
```text
[Usuário clica Refinar]
  → Upload imagem atual + ref extra para Storage
  → checkActiveJob()
  → createJob('image_generator', userId, sessionId, { prompt, aspect_ratio, source: 'arcano_cloner_refine' })
  → startJob('image_generator', jobId, { referenceImageUrls, aspectRatio, creditCost: 30, prompt, source: 'arcano_cloner_refine' })
  → UI mostra loading/progresso
  → useJobStatusSync recebe update via Realtime
  → Quando completed: atualiza outputImage + refinementHistory
```

### Mudanças na Edge Function `runninghub-image-generator/run`
- Receber campo `source` opcional no body
- Se `source === 'arcano_cloner_refine' || source === 'flyer_maker_refine'`:
  - Usar `creditCost` do body (30) em vez de calcular
  - Usar descrição "Refinamento Arcano Cloner" ou "Refinamento Flyer Maker"

### UX durante refinamento
- O refinamento vai mostrar um loading/spinner enquanto o job processa (igual ao fluxo principal)
- Se já houver um job ativo em outra ferramenta, mostra o modal de bloqueio
- O refinamento entra na fila global (máximo 3 simultâneos)

### Arquivos Modificados
1. `src/pages/ArcanoClonerTool.tsx` — Refatorar `handleRefine()` para usar JobManager
2. `src/pages/FlyerMakerTool.tsx` — Refatorar `handleRefine()` para usar JobManager  
3. `supabase/functions/runninghub-image-generator/index.ts` — Aceitar campo `source` para custo diferenciado

