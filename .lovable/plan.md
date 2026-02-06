

# Plano: Modal de Compressão para Imagens Grandes (>2000px) em TODAS as Ferramentas de IA

## Resumo

Quando o usuário enviar uma imagem maior que 2000 pixels em **qualquer ferramenta de IA**, ao invés de mostrar erro, o sistema:
1. Abre um **modal perguntando se quer comprimir** a imagem
2. Se clicar "Comprimir", a imagem é redimensionada para **máximo 1999px** mantendo proporção
3. Após upload, **mostra o tamanho final** da imagem abaixo da foto

Tudo acontece **100% no PC do usuário** (client-side), sem consumir cloud.

---

## Ferramentas Afetadas

| Ferramenta | Componente de Upload | Tipo |
|------------|---------------------|------|
| **Upscaler Arcano** | Upload inline (`handleFileSelect`) | Imagem única |
| **Pose Changer** | `ImageUploadCard` (2x) | Pessoa + Pose |
| **Veste AI** | `ImageUploadCard` (2x) | Pessoa + Roupa |
| Video Upscaler | `VideoUploadCard` | **Vídeo** (não aplica) |

---

## Arquitetura da Solução

### 1. Novo Componente: Modal de Compressão

```
src/components/ai-tools/ImageCompressionModal.tsx (NOVO)
```

Modal centralizado que:
- Recebe arquivo original e dimensões detectadas
- Mostra aviso sobre o tamanho
- Oferece botão "Comprimir e Usar" 
- Executa compressão client-side para máximo 1999px
- Retorna arquivo comprimido + dimensões finais via callback

### 2. Novas Funções no Hook Central

```
src/hooks/useImageOptimizer.ts (ATUALIZAR)
```

Adicionar funções que retornam dimensões sem bloquear:
- `getImageDimensions(file)` → `{ width, height }`
- `compressToMaxDimension(file, 1999)` → `{ file, width, height }`

### 3. Componente ImageUploadCard Atualizado

```
src/components/pose-changer/ImageUploadCard.tsx (ATUALIZAR)
```

Mudanças:
- Detectar imagem >2000px e abrir modal (em vez de erro)
- Mostrar dimensões finais (`📐 1999 x 1599 px`) abaixo da foto
- Novo callback para receber dimensões finais

### 4. Integração em Cada Ferramenta

| Arquivo | Mudança |
|---------|---------|
| `UpscalerArcanoTool.tsx` | Integrar modal no `handleFileSelect` + mostrar dimensões |
| `PoseChangerTool.tsx` | Já usa `ImageUploadCard` - automático |
| `VesteAITool.tsx` | Já usa `ImageUploadCard` - automático |

---

## Fluxo do Usuário

```text
Usuário seleciona imagem
         ↓
Sistema verifica dimensões
         ├── Se ≤2000px → Aceita + exibe tamanho final
         └── Se >2000px → Abre modal ↓

┌─────────────────────────────────────────────────────┐
│  📐 Imagem Muito Grande (3500 x 2800 px)            │
│                                                     │
│  O limite máximo é 2000 pixels.                     │
│  Deseja comprimir automaticamente para 1999px?      │
│  A proporção será mantida.                          │
│                                                     │
│  [Cancelar]           [📐 Comprimir e Usar]         │
└─────────────────────────────────────────────────────┘
         ↓
Se "Comprimir": imagem redimensionada → aceita → exibe tamanho

Resultado:
┌─────────────────────────────────────────────────────┐
│                 [Imagem do usuário]                 │
│                                                     │
│           📐 1999 x 1599 px                         │
└─────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/ai-tools/ImageCompressionModal.tsx` | Modal centralizado de compressão |

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useImageOptimizer.ts` | Adicionar `getImageDimensions` e `compressToMaxDimension` |
| `src/components/pose-changer/ImageUploadCard.tsx` | Integrar modal + exibir dimensões finais |
| `src/components/ai-tools/index.ts` | Exportar novo modal |
| `src/pages/UpscalerArcanoTool.tsx` | Integrar modal no upload inline + exibir dimensões |
| `src/pages/PoseChangerTool.tsx` | Passar callback de dimensões para o card |
| `src/pages/VesteAITool.tsx` | Passar callback de dimensões para o card |

---

## Detalhes Técnicos

### ImageCompressionModal.tsx

```typescript
interface ImageCompressionModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File;
  originalWidth: number;
  originalHeight: number;
  onCompress: (compressedFile: File, newWidth: number, newHeight: number) => void;
}
```

Comportamento:
- Mostra dimensões originais em destaque
- Loading spinner durante compressão
- Usa `compressToMaxDimension(file, 1999)` do hook centralizado

### useImageOptimizer.ts - Novas Funções

```typescript
// Retorna dimensões da imagem
export const getImageDimensions = (file: File): Promise<{width: number; height: number}>

// Comprime para máximo X pixels mantendo proporção
export const compressToMaxDimension = async (
  file: File, 
  maxPx: number
): Promise<{
  file: File;
  width: number;
  height: number;
}>
```

A compressão usa `browser-image-compression` que já está instalado - 100% client-side.

### ImageUploadCard.tsx - Mudanças

Novo callback na interface:
```typescript
interface ImageUploadCardProps {
  // ... props existentes
  onDimensionsChange?: (width: number, height: number) => void;
}
```

Estado interno:
```typescript
const [showCompressionModal, setShowCompressionModal] = useState(false);
const [pendingFile, setPendingFile] = useState<File | null>(null);
const [pendingDimensions, setPendingDimensions] = useState<{w: number, h: number} | null>(null);
const [finalDimensions, setFinalDimensions] = useState<{w: number, h: number} | null>(null);
```

Lógica atualizada:
```typescript
// ANTES: toast.error se >2000px e retorna
// DEPOIS: abre modal e deixa usuário escolher

const validation = await validateImageDimensions(file);
if (!validation.valid && (validation.width > 2000 || validation.height > 2000)) {
  setPendingFile(file);
  setPendingDimensions({ w: validation.width, h: validation.height });
  setShowCompressionModal(true);
  return; // não rejeita, aguarda decisão do usuário
}
```

Exibição de dimensões:
```tsx
{finalDimensions && image && (
  <div className="text-[9px] text-purple-300 text-center py-1 border-t border-purple-500/20">
    📐 {finalDimensions.w} x {finalDimensions.h} px
  </div>
)}
```

### UpscalerArcanoTool.tsx - Integração

O Upscaler tem upload inline (não usa ImageUploadCard), então precisa da mesma lógica:

```typescript
// Estados novos
const [showCompressionModal, setShowCompressionModal] = useState(false);
const [pendingFile, setPendingFile] = useState<File | null>(null);
const [pendingDimensions, setPendingDimensions] = useState<{w: number, h: number} | null>(null);
const [inputDimensions, setInputDimensions] = useState<{w: number, h: number} | null>(null);

// No handleFileSelect, em vez de retornar erro:
const validation = await validateImageDimensions(file);
if (!validation.valid && (validation.width > 2000 || validation.height > 2000)) {
  setPendingFile(file);
  setPendingDimensions({ w: validation.width, h: validation.height });
  setShowCompressionModal(true);
  return;
}

// Após aceitar (normal ou comprimido):
setInputDimensions({ w: finalWidth, h: finalHeight });

// Exibir abaixo da imagem de entrada:
{inputDimensions && inputImage && (
  <div className="text-xs text-purple-300 text-center mt-1">
    📐 {inputDimensions.w} x {inputDimensions.h} px
  </div>
)}
```

---

## Garantias

| Garantia | Como |
|----------|------|
| 100% client-side | Usa `browser-image-compression` (já instalado) |
| Sem custo de cloud | Compressão no navegador do usuário |
| Proporção mantida | Redimensiona pelo maior lado para 1999px |
| Unificado | Um único modal/lógica para todas as IAs |
| Não quebra nada | Adiciona opção onde antes tinha erro |
| Máximo 1999px | Garante que nunca passa de 2000px |

---

## Checklist de Implementação

1. [ ] Criar `src/components/ai-tools/ImageCompressionModal.tsx`
2. [ ] Adicionar `getImageDimensions` e `compressToMaxDimension` em `useImageOptimizer.ts`
3. [ ] Atualizar `ImageUploadCard.tsx` com modal + exibição de dimensões
4. [ ] Exportar novo componente em `src/components/ai-tools/index.ts`
5. [ ] Integrar no `UpscalerArcanoTool.tsx` (upload inline)
6. [ ] Passar callback de dimensões em `PoseChangerTool.tsx`
7. [ ] Passar callback de dimensões em `VesteAITool.tsx`
8. [ ] Testar em todas as ferramentas

---

## Resultado Final

Todas as ferramentas de IA (Upscaler, Pose Changer, Veste AI) terão:
- ✅ Modal de compressão quando imagem > 2000px
- ✅ Compressão automática para 1999px mantendo proporção
- ✅ Exibição do tamanho final (`📐 1999 x 1599 px`) abaixo da foto
- ✅ Processamento 100% no navegador do usuário

