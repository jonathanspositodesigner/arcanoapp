
# Correção: Edge Functions retornando 404 (deploy quebrado)

## Diagnóstico

Os logs mostram claramente:
```
OPTIONS | 404 | https://jooojbaljrshgpaxdlou.supabase.co/functions/v1/runninghub-upscaler/run
```

**Causa raiz:** As Edge Functions usam import incompatível com o runtime do Supabase:
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
```

O edge-runtime do Supabase não consegue resolver esse import, fazendo o deploy falhar silenciosamente e retornar 404 em todas as requisições.

## Solução

Migrar as 4 funções afetadas para usar `Deno.serve()` nativo (como já foi feito no `runninghub-queue-manager`):

```typescript
// ❌ ANTES (quebrado)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(async (req) => { ... });

// ✅ DEPOIS (funciona)
Deno.serve(async (req) => { ... });
```

## Arquivos a modificar

1. **`supabase/functions/runninghub-upscaler/index.ts`**
   - Remover `import { serve }` 
   - Remover `import "https://deno.land/x/xhr@0.1.0/mod.ts"` (não necessário no Deno moderno)
   - Trocar `serve(async (req) => {` por `Deno.serve(async (req) => {`

2. **`supabase/functions/runninghub-pose-changer/index.ts`**
   - Mesma migração

3. **`supabase/functions/runninghub-veste-ai/index.ts`**
   - Mesma migração

4. **`supabase/functions/runninghub-video-upscaler/index.ts`**
   - Mesma migração (já não tem xhr import)

## Resultado esperado

- Edge Functions voltam a responder normalmente (200 em vez de 404)
- Upscaler Arcano (Standard/PRO, todos os modos) funciona novamente
- Pose Changer, Veste AI e Video Upscaler também ficam estáveis
