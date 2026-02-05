
# Fix: Pinar Versão do Supabase Client em Todas Edge Functions

## Problema Identificado

O erro `Bundle generation timed out` está ocorrendo porque as edge functions usam uma versão flutuante do supabase-js (`@2` sem versão específica), causando resolução lenta de dependências durante o deploy.

## Solução

Pinar a versão em `@2.49.4` em todas as edge functions de IA:

| Arquivo | Linha | Antes | Depois |
|---------|-------|-------|--------|
| `runninghub-upscaler/index.ts` | 2 | `@supabase/supabase-js@2` | `@supabase/supabase-js@2.49.4` |
| `runninghub-pose-changer/index.ts` | 2 | `@supabase/supabase-js@2` | `@supabase/supabase-js@2.49.4` |
| `runninghub-veste-ai/index.ts` | 2 | `@supabase/supabase-js@2` | `@supabase/supabase-js@2.49.4` |
| `runninghub-video-upscaler/index.ts` | 2 | `@supabase/supabase-js@2` | `@supabase/supabase-js@2.49.4` |

## Mudança

```typescript
// ANTES
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// DEPOIS
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
```

## Resultado

Após a correção, o deploy das edge functions será rápido e o Upscaler funcionará normalmente.
