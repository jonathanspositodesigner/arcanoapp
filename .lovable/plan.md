

## Diagnóstico

O job `2019471503829110786` está com status `running` no banco de dados desde `18:01:40`, mas nunca recebeu o callback de conclusão do RunningHub. O webhook (`runninghub-webhook`) não registrou nenhuma chamada.

**Causa raiz identificada**: As funções de RunningHub ainda estão usando `esm.sh` para importar o Supabase client, enquanto as outras 22 funções já foram migradas para `npm:`. Isso pode causar falhas de bundling/deploy, resultando em webhooks não funcionais.

## O que será feito

### 1. Corrigir 6 funções de RunningHub para usar `npm:` em vez de `esm.sh`

| Arquivo | Mudança |
|---------|---------|
| `runninghub-webhook/index.ts` | `esm.sh/@supabase/supabase-js@2` → `npm:@supabase/supabase-js@2` |
| `runninghub-upscaler/index.ts` | `esm.sh/@supabase/supabase-js@2` → `npm:@supabase/supabase-js@2` |
| `runninghub-pose-changer/index.ts` | `esm.sh/@supabase/supabase-js@2` → `npm:@supabase/supabase-js@2` |
| `runninghub-veste-ai/index.ts` | `esm.sh/@supabase/supabase-js@2` → `npm:@supabase/supabase-js@2` |
| `runninghub-video-upscaler/index.ts` | `esm.sh/@supabase/supabase-js@2` → `npm:@supabase/supabase-js@2` |
| `runninghub-video-upscaler-webhook/index.ts` | `esm.sh/@supabase/supabase-js@2` → `npm:@supabase/supabase-js@2` |

### 2. Fazer deploy de todas as 6 funções

### 3. Corrigir manualmente o job pendente

Depois do deploy, vou atualizar o status do job para `failed` e estornar os 60 créditos do usuário.

## Resultado esperado

- Todas as funções de IA usando o padrão estável (`npm:`)
- Webhooks funcionando corretamente
- Próximos jobs receberão os callbacks normalmente

