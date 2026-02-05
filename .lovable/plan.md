

# Plano: Corrigir Deploy do Webhook Greenn Artes

## Problema Identificado

A Edge Function `webhook-greenn-artes` **NÃO ESTÁ DEPLOYADA** no Supabase. Quando a Greenn tenta enviar um webhook, recebe erro 404 (função não encontrada).

O deploy está falhando com "Bundle generation timed out" - provavelmente por causa da importação via `esm.sh` que está instável.

## Solução

Atualizar a importação do Supabase client de `esm.sh` para `npm:` (mais estável e recomendado):

```typescript
// ANTES (linha 1)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// DEPOIS
import { createClient } from 'npm:@supabase/supabase-js@2'
```

## Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/webhook-greenn-artes/index.ts` | Trocar import de `esm.sh` para `npm:` |

## Após o Deploy

1. Testar a URL novamente
2. Reenviar os webhooks das vendas perdidas na Greenn
3. Verificar se todos os clientes foram ativados

## Vendas Perdidas a Reprocessar

Após o deploy, você precisará reenviar os webhooks na Greenn para:
1. `venicio.scatolino@gm...` (12:25)
2. `ellemarie.2011@hotma...` (12:33)
3. `dayvsonuser@gmail.co...` (12:37)
4. `henriquearaujo271509...` (13:16)
5. `robson.b.dantas@gmai...` (13:32)
6. `llena_cavalcante@hot...` (14:05)
7. `hildafotos.01@gmail...` (14:09)

