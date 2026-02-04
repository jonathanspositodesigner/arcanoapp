
# Plano: Centralizar Compressão de Imagem para Ferramentas de IA (1536px)

## ✅ IMPLEMENTADO

Todas as ferramentas de IA agora usam a função centralizada `optimizeForAI` com limite de 1536px.

### Mudanças Realizadas

| Arquivo | Status |
|---------|--------|
| `src/hooks/useImageOptimizer.ts` | ✅ Adicionada função `optimizeForAI` |
| `src/pages/UpscalerArcanoTool.tsx` | ✅ Usando `optimizeForAI` |
| `src/pages/PoseChangerTool.tsx` | ✅ Usando `optimizeForAI` |
| `src/pages/VesteAITool.tsx` | ✅ Usando `optimizeForAI` |

### Configuração Centralizada

```typescript
const AI_OPTIMIZATION_CONFIG = {
  maxSizeMB: 2,
  maxWidthOrHeight: 1536,  // Limite seguro para VRAM
  useWebWorker: true,
  fileType: 'image/webp',
  initialQuality: 0.9,
};
```

### Benefícios

1. **Consistência**: Todas as ferramentas usam o mesmo limite de 1536px
2. **Manutenibilidade**: Mudança em um único lugar afeta todas as ferramentas
3. **Prevenção de erros**: Evita VRAM overflow em todas as ferramentas

