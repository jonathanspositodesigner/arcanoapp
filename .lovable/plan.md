

## Diagnóstico e Correções para o Remover Fundo

### Problema 1: Compressão ativa para imagens pequenas
Em `RemoverFundoTool.tsx` linha 244, `compressImage` (que chama `optimizeForAI`) é executado **sempre**, independente do tamanho da imagem. O modal de compressão (`ImageCompressionModal`) só aparece para imagens > 2000px, mas a compressão no `handleProcess` roda em todas — inclusive imagens de 500x500.

**Correção**: Verificar as dimensões da imagem antes de chamar `optimizeForAI`. Se ambas as dimensões forem ≤ 2000px, pular a compressão e usar o arquivo original.

**Arquivo**: `src/pages/RemoverFundoTool.tsx` — alterar `handleProcess` para verificar dimensões via `getImageDimensions` antes de comprimir.

### Problema 2: Cleanup de 24h não inclui bg-remover
O array `AI_FOLDERS` em `cleanup-ai-storage/index.ts` **não contém** `"bg-remover"`. Isso significa que os arquivos de input do Remover Fundo nunca são deletados e vão acumular indefinidamente no storage.

**Correção**: Adicionar `"bg-remover"` ao array `AI_FOLDERS`.

**Arquivo**: `supabase/functions/cleanup-ai-storage/index.ts` — adicionar `"bg-remover"` na lista.

### Resumo das mudanças

| Arquivo | Mudança |
|---------|---------|
| `src/pages/RemoverFundoTool.tsx` | Só comprimir se imagem > 2000px |
| `supabase/functions/cleanup-ai-storage/index.ts` | Adicionar `bg-remover` ao cleanup |

