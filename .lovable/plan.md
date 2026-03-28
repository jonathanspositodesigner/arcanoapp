

# Compressão de Frames no Upload de Vídeo

## Problema
As imagens de frame (1º Frame e Último Frame) na ferramenta de vídeo são enviadas sem nenhuma compressão. Fotos de celular com 4000px+ são enviadas cruas, sobrecarregando a RunningHub.

## Solução
Adicionar compressão client-side usando `optimizeForAI()` (já existente) no momento do upload dos frames, antes de converter para base64.

## Mudança Única

**Arquivo: `src/pages/GerarVideoTool.tsx`**

Modificar `handleFrameSelect` (linhas 93-107) para:
1. Importar `optimizeForAI` de `@/hooks/useImageOptimizer`
2. Antes de ler o arquivo como base64, comprimir com `optimizeForAI()` — converte para JPEG ≤1536px, qualidade 0.9
3. Usar o arquivo comprimido para gerar o base64

```
Fluxo atual:   File → FileReader → base64 → enviar
Fluxo novo:    File → optimizeForAI() → File comprimido → FileReader → base64 → enviar
```

A função `optimizeForAI` já existe e faz exatamente o que precisa:
- Máx 1536px (width ou height)
- Converte para JPEG (compatível com RunningHub)
- Qualidade 0.9
- Usa Web Worker para não travar a UI

Nenhuma outra mudança necessária — a edge function e o upload para RunningHub recebem o base64 já otimizado.

