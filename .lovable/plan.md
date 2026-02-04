
# Plano: Centralizar Compressão de Imagem para Ferramentas de IA (1536px)

## Objetivo
Criar uma função utilitária centralizada para otimização de imagens que será usada por todas as ferramentas de IA, garantindo o limite de 1536 pixels para evitar erros de VRAM no RunningHub.

---

## Situação Atual

| Ferramenta | Compressão | Limite Atual | Problema |
|------------|------------|--------------|----------|
| Upscaler Arcano | ✅ | 1536px | ✓ Correto |
| Pose Changer | ✅ | 2048px | ❌ Muito grande |
| Veste AI | ✅ | 2048px | ❌ Muito grande |
| Video Upscaler | N/A | N/A | Não aplica (vídeo) |

---

## Solução: Hook Centralizado

### 1. Atualizar `useImageOptimizer.ts`

Atualizar o hook existente com uma nova função `optimizeForAI` que usa as configurações corretas para as ferramentas de IA:

```text
optimizeForAI(file: File): Promise<OptimizationResult>
  - maxSizeMB: 2
  - maxWidthOrHeight: 1536  ← Limite seguro para VRAM
  - fileType: 'image/webp'
  - initialQuality: 0.9
  - useWebWorker: true
```

### 2. Atualizar Ferramentas

| Arquivo | Modificação |
|---------|-------------|
| `src/hooks/useImageOptimizer.ts` | Adicionar função `optimizeForAI` |
| `src/pages/UpscalerArcanoTool.tsx` | Usar `optimizeForAI` do hook |
| `src/pages/PoseChangerTool.tsx` | Substituir `compressImage` local por `optimizeForAI` |
| `src/pages/VesteAITool.tsx` | Substituir `compressImage` local por `optimizeForAI` |

---

## Detalhes Técnicos

### Nova Função no Hook

Adicionar ao `src/hooks/useImageOptimizer.ts`:

```text
AI_OPTIMIZATION_CONFIG = {
  maxSizeMB: 2,
  maxWidthOrHeight: 1536,
  useWebWorker: true,
  fileType: 'image/webp',
  initialQuality: 0.9,
}

export async function optimizeForAI(file: File): Promise<OptimizationResult>
  - Aplica compressão com as configurações acima
  - Retorna arquivo otimizado + métricas (original size, optimized size, savings)
  - Loga no console as estatísticas de otimização
  - Nunca falha silenciosamente - retorna arquivo original se compressão falhar
```

### Uso nas Ferramentas

Cada ferramenta vai importar e usar:

```text
import { optimizeForAI } from '@/hooks/useImageOptimizer';

// No handleProcess ou compressImage:
const result = await optimizeForAI(file);
const optimizedFile = result.file;
```

---

## Benefícios

1. **Consistência**: Todas as ferramentas usam o mesmo limite de 1536px
2. **Manutenibilidade**: Mudança em um único lugar afeta todas as ferramentas
3. **Menos código**: Remove duplicação de lógica de compressão
4. **Prevenção de erros**: Evita VRAM overflow em todas as ferramentas

---

## Ferramentas Não Afetadas

- **Video Upscaler**: Trabalha com vídeos, não imagens estáticas
- **ImageUploadCard**: Componente de UI genérico, a compressão acontece na ferramenta pai

---

## Ordem de Implementação

1. Atualizar `useImageOptimizer.ts` com `optimizeForAI`
2. Refatorar `UpscalerArcanoTool.tsx` para usar o hook
3. Refatorar `PoseChangerTool.tsx` - remover `compressImage` local
4. Refatorar `VesteAITool.tsx` - remover `compressImage` local
5. Testar todas as ferramentas com imagens grandes
