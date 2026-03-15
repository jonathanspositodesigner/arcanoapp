

## Bugs encontrados e correções

### Diagnose completa

Analisei o banco de dados e o código. Os jobs recentes do upscaler estão todos **completando com sucesso** -- o último erro real foi em 14/03. O erro "Erro ao processar imagem" que o usuário viu acontece **no cliente, antes do upload**, no `handleFileSelect` (linha 414-417) quando `getImageDimensions` ou `processFileWithDimensions` falha.

As causas raiz são:

**Bug 1 -- Content-type errado no Upscaler (CRÍTICO)**
`optimizeForAI()` converte para **JPEG** (`image/jpeg`, extensão `.jpg`), mas o upload na linha 525-537 assume WebP:
- Comentário errado: "optimizeForAI always converts to WebP"
- Extensão: `.webp` (deveria ser `.jpg`)
- `contentType: 'image/webp'` (deveria ser `'image/jpeg'`)

Isso causa o RunningHub receber dados JPEG rotulados como WebP, o que pode gerar falhas intermitentes.

**Bug 2 -- Compressão interruptível via modal (CRÍTICO)**
Quando a imagem > 2000px, abre um modal pedindo confirmação. Se o usuário fecha ou cancela, fica num limbo sem feedback. Deveria comprimir automaticamente sem perguntar.

**Bug 3 -- Catch genérico sem fallback (Upscaler)**
Na linha 414-416, se `getImageDimensions` falha (ex: HEIC, formato não suportado, imagem corrompida), o catch mostra "Erro ao processar imagem" sem tentar nada.

**Bug 4 -- Mesmo content-type errado em VesteAI, PoseChanger, RemoverFundo, GeradorPersonagem**
Todas as ferramentas fazem `optimizeForAI()` que produz JPEG, mas fazem upload com `contentType: 'image/webp'` e extensão `.webp`.

---

### Correções planejadas

#### 1. `src/hooks/useImageOptimizer.ts`
- Adicionar função utilitária `safeGetImageDimensions` que faz try/catch e retorna dimensões padrão em caso de erro, permitindo que o fluxo continue.

#### 2. `src/pages/UpscalerArcanoTool.tsx`
- **handleFileSelect** (linhas 388-418): Remover o modal de compressão. Se imagem > 2000px, comprimir automaticamente com `compressToMaxDimension(file, 1999)` silenciosamente. Catch resiliente que tenta processar a imagem original mesmo se a leitura de dimensões falhar.
- **processImage** (linhas 525-537): Corrigir extensão para `.jpg` e `contentType` para `'image/jpeg'`. Corrigir `input_file_name` na linha 567.
- Remover imports e state do `ImageCompressionModal` (showCompressionModal, pendingFile, pendingDimensions) e o componente no JSX.

#### 3. `src/pages/VesteAITool.tsx`
- **uploadToStorage** (linhas 269-278): Mudar extensão `.webp` → `.jpg` e `contentType: 'image/webp'` → `'image/jpeg'`.

#### 4. `src/pages/PoseChangerTool.tsx`
- **uploadToStorage** (linhas 269-278): Mesma correção de extensão e contentType.

#### 5. `src/pages/RemoverFundoTool.tsx`
- **uploadToStorage** (linhas 221-223): Mesma correção.

#### 6. `src/pages/GeradorPersonagemTool.tsx`
- **upload** (linhas 222-224): Mesma correção.

#### 7. `src/components/upscaler/trial/UpscalerTrialSection.tsx`
- **handleFileSelect** (linhas 141-168): Remover modal, comprimir automaticamente se > 2000px.
- Remover imports e state do modal.

#### 8. `src/components/pose-changer/ImageUploadCard.tsx`
- **handleFileSelect** (linhas 52-82): Remover modal, comprimir automaticamente se > 2000px.
- Remover imports e state do modal.

#### 9. `src/pages/RemoverFundoTool.tsx`
- **processFile** (linhas 171-196): Remover modal, comprimir automaticamente se > 2000px.
- Remover imports e state do modal.

#### 10. `src/components/arcano-cloner/trial/ClonerTrialSection.tsx`
- **handleFileSelect** (linhas 121-168): Remover modal, comprimir automaticamente se > 2000px.

### Resumo

| Arquivo | Mudança |
|---|---|
| `useImageOptimizer.ts` | Nova função `safeGetImageDimensions` resiliente |
| `UpscalerArcanoTool.tsx` | Auto-compress + fix JPEG content-type + remover modal |
| `VesteAITool.tsx` | Fix extensão/contentType para JPEG |
| `PoseChangerTool.tsx` | Fix extensão/contentType para JPEG |
| `RemoverFundoTool.tsx` | Fix extensão/contentType + auto-compress |
| `GeradorPersonagemTool.tsx` | Fix extensão/contentType para JPEG |
| `UpscalerTrialSection.tsx` | Auto-compress + remover modal |
| `ImageUploadCard.tsx` | Auto-compress + remover modal |
| `ClonerTrialSection.tsx` | Auto-compress + remover modal |

