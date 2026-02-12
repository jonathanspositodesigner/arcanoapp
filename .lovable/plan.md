

# Plano: Integrar Upscaler Standard Real na Secao de Teste Gratuito

## Problema Atual

O codigo atual do trial esta **completamente errado** em relacao a API:
- Envia `image_url`, `mode`, `category: "photo"` -- parametros que **nao existem** na Edge Function
- A Edge Function espera: `jobId`, `imageUrl`, `version`, `userId`, `creditCost`, `category` (valores como `pessoas_perto`, `comida`, etc.)
- A compressao atual usa `maxWidthOrHeight: 4096` e `maxSizeMB: 4` -- esta errado, o correto e **JPEG, 1536px, 2MB** via `optimizeForAI()`
- Nao cria job na tabela `upscaler_jobs` antes de chamar a API
- O polling chama `runninghub-upscaler/run` com `action: "status"` -- endpoint que **nao existe**

## Configuracao Exata dos Botoes (Standard) - Extraido do Codigo

Cada categoria chama um **WebApp ID diferente** no backend:

| Categoria | WebApp ID | `detailDenoise` | `resolution` | `prompt` | `framingMode` |
|-----------|-----------|-----------------|--------------|----------|---------------|
| Pessoas (Perto) | `2017030861371219969` | 0.15 (fixo) | 2048 | Prompt automatico portrait | `perto` |
| Pessoas (Longe) | `2020634325636616194` | 0.15 (fixo) | 2048 | Prompt automatico full-body | `longe` |
| Comida/Objeto | `2015855359243587585` | Slider 0.70-1.00 (padrao 0.85) | `undefined` | `undefined` | `undefined` |
| Foto Antiga | `2018913880214343681` | `undefined` | `undefined` | `undefined` | `undefined` |
| Logo/Arte | `2019239272464785409` | `undefined` | `undefined` | `undefined` | `undefined` |
| Selo 3D | `2019234965992509442` | `undefined` | `undefined` | `undefined` | `undefined` |

Controles visiveis no Standard:
- **Pessoas**: Sub-seletor "De Perto" / "De Longe" (com SVGs)
- **Comida/Objeto**: Slider "Nivel de Detalhes" (0.70 a 1.00, padrao 0.85)
- **Foto Antiga, Logo, Selo 3D**: Nenhum controle extra

## Compressao Correta (Extraida de `useImageOptimizer.ts`)

```text
AI_OPTIMIZATION_CONFIG = {
  maxSizeMB: 2,
  maxWidthOrHeight: 1536,    // JPEG, NAO WebP
  fileType: 'image/jpeg',
  initialQuality: 0.9
}
```

Fluxo de compressao:
1. Se imagem > 2000px em qualquer dimensao -> abre `ImageCompressionModal` para confirmar
2. SEMPRE chama `optimizeForAI()` que converte para **JPEG, 1536px max, 2MB max**

## Mudancas Tecnicas

### 1. `UpscalerMockup.tsx` - Refatoracao completa

Substituir as 4 categorias mockup pelas 5 categorias reais:
- Layout em 2 linhas: `[Pessoas, Comida/Objeto, Foto Antiga]` + `[Selo 3D, Logo/Arte]`
- Quando "Pessoas" selecionado: sub-seletor Perto/Longe com SVGs identicos (copiados linha a linha do `UpscalerArcanoTool.tsx` linhas 929-953)
- Quando "Comida/Objeto" selecionado: slider 0.70-1.00 com labels "Mais Fiel" / "Mais Criativo"
- Props novas: `selectedCategory`, `pessoasFraming`, `comidaDetailLevel`, `onCategoryChange`, `onFramingChange`, `onDetailLevelChange`

### 2. `UpscalerTrialSection.tsx` - Reescrever integracao

**Novos estados:**
- `selectedCategory` (default: `pessoas`)
- `pessoasFraming` (default: `perto`)
- `comidaDetailLevel` (default: 0.85)
- `showCompressionModal`, `pendingFile`, `pendingDimensions`

**Fluxo de selecao de arquivo (igual ao original):**
1. Validar tipo (image/*) e tamanho (max 10MB)
2. `getImageDimensions()` -> se > 2000px, abrir `ImageCompressionModal`
3. Apos compressao ou se ok -> chamar `optimizeForAI()` (JPEG 1536px 2MB)
4. Guardar arquivo processado em state

**Fluxo de processamento (`handleGenerate`):**
1. Consumir uso do trial via `landing-trial-code/consume`
2. Upload do arquivo comprimido para `artes-cloudinary` bucket (path: `upscaler/trial_{email_hash}/{uuid}.webp`)
3. Obter URL publica
4. Criar job na tabela `upscaler_jobs` com campos: `session_id`, `status: 'pending'`, `user_id` (null ou trial), `category`, `version: 'standard'`, `resolution`, `framing_mode`
5. Chamar `runninghub-upscaler/run` com parametros exatos:

```text
body = {
  jobId: job.id,
  imageUrl: publicUrl,
  version: 'standard',
  userId: trialUserId,
  creditCost: 60,
  category: effectiveCategory,
  detailDenoise: isComida ? comidaDetailLevel : (isPessoas ? 0.15 : undefined),
  resolution: isSpecialWorkflow ? undefined : 2048,
  prompt: isSpecialWorkflow ? undefined : PROMPT_CATEGORIES[effectiveCategory],
  framingMode: isSpecialWorkflow ? undefined : (isPessoas ? pessoasFraming : undefined),
}
```

6. Usar `useJobStatusSync` para acompanhar resultado via Realtime + polling (mesmo hook do original)

**Controle de erros (identico ao original):**
- `useProcessingButton` para prevenir cliques duplos
- Timeout de 10 minutos via `useJobStatusSync`
- Tratamento de falhas com `getAIErrorMessage()`
- Toast de erro amigavel em cada passo

### 3. Questao do userId para trial

O backend exige `userId` como UUID valido. Para o trial sem autenticacao, precisamos de uma das abordagens:
- Usar um UUID fixo de "trial user" que sera definido como constante
- OU criar um usuario anonimo temporario

A abordagem mais segura e usar um UUID fixo que o backend reconheca como trial, ja que o `landing-trial-code/consume` ja controla os usos. O `creditCost` sera enviado como 0 (ou adaptar o backend para aceitar `trial_mode: true` e pular a cobranca de creditos).

**ATENCAO:** O backend valida `userId` como UUID e cobra creditos via `consume_upscaler_credits`. Para o trial, precisaremos verificar se o Edge Function ja tem suporte a `trial_mode` ou se precisaremos adicionar essa logica. Se nao tiver, adicionaremos uma verificacao no inicio do `handleRun` que pula a cobranca de creditos quando `trial_mode: true`.

### 4. Ajuste no Backend (se necessario)

Verificar se `runninghub-upscaler/run` aceita `trial_mode`. Se nao aceitar, adicionar:
- Antes da validacao de `userId`: se `trial_mode === true`, usar UUID fixo de trial
- Antes de `consume_upscaler_credits`: se `trial_mode === true`, pular cobranca

### 5. RLS / Storage

O upload vai para `artes-cloudinary` bucket que ja tem politica universal para `{tool}/{user_id}/file`. Para trial sem auth, pode ser necessario usar o bucket `upscaler-uploads` que ja existe e esta sendo usado pelo trial atual, ou adaptar o upload para usar service role no backend.

## Fluxo Completo do Usuario

```text
1. Seleciona categoria (Pessoas, Comida, Foto Antiga, Selo 3D, Logo)
2. Se "Pessoas" -> escolhe "De Perto" ou "De Longe" (SVGs)
3. Se "Comida" -> ajusta slider de detalhe 0.70-1.00 (opcional)
4. Faz upload da foto
5. Se foto > 2000px -> modal de compressao (ImageCompressionModal)
6. optimizeForAI() comprime para JPEG 1536px max automaticamente
7. Clica "Melhorar Imagem"
8. Consome 1 uso do trial
9. Upload para storage
10. Cria job na tabela
11. Chama runninghub-upscaler/run com parametros corretos da categoria
12. useJobStatusSync acompanha via Realtime
13. Resultado aparece na tela
```
