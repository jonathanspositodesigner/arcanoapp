

# Correção: Refinar no Arcano Cloner + Cancelar Job

## Problemas Identificados

### 1. Refine falha sistematicamente (TODAS as tentativas de refinamento)
**Causa raiz**: Quando o Arcano Cloner completa um job, o `outputImage` pode ser uma URL do CDN externo da RunningHub (`rh-images-1252422369.cos.ap-beijing.myqcloud.com`). Ao tentar refinar, essa URL é enviada como referência para a edge function `runninghub-image-generator`, que valida se TODAS as URLs são do domínio Supabase. A URL do CDN é rejeitada com `INVALID_IMAGE_SOURCE` (status 400).

Além disso, quando o catch block tenta marcar o job como failed via `markJobAsFailedInDb`, a RPC `mark_pending_job_as_failed` NÃO tem `image_generator_jobs` nas branches → retorna false silenciosamente → job fica preso em `pending` até o orphan timeout (240s).

### 2. Cancelar job retorna "tabela inválida"
**Causa raiz**: A RPC `user_cancel_ai_job` não tem branches para `arcano_cloner_jobs` nem `image_generator_jobs`. Qualquer tentativa de cancelar jobs dessas ferramentas cai no ELSE → "Tabela inválida".

## Alterações

### Passo 1: Atualizar RPC `user_cancel_ai_job`
**Tipo**: Migration SQL

Adicionar branches para `arcano_cloner_jobs` e `image_generator_jobs` (tanto no SELECT quanto no UPDATE).

### Passo 2: Atualizar RPC `mark_pending_job_as_failed`
**Tipo**: Migration SQL

Adicionar branches para `arcano_cloner_jobs` e `image_generator_jobs`.

### Passo 3: Corrigir validação de URL na edge function do Image Generator
**Arquivo**: `supabase/functions/runninghub-image-generator/index.ts`

Adicionar o domínio do CDN da RunningHub (`rh-images-1252422369.cos.ap-beijing.myqcloud.com`) à lista de domínios permitidos, OU (mais robusto) fazer re-upload da imagem de referência para o Supabase Storage no frontend antes de enviar para a edge function.

A abordagem mais segura é adicionar os domínios CDN da RunningHub como permitidos na edge function, já que são URLs legítimas de resultados anteriores:

```ts
const allowedDomains = [
  'supabase.co', 'supabase.in', 
  SUPABASE_URL.replace('https://', ''),
  'rh-images-1252422369.cos.ap-beijing.myqcloud.com', // RunningHub CDN
];
```

### Passo 4: Redeploy da edge function
Deploy automático de `runninghub-image-generator`.

## Resultado Esperado
- Refinar funciona mesmo quando `outputImage` é URL do CDN
- Cancelar job funciona para Arcano Cloner e Image Generator
- Jobs órfãos de refine são marcados como failed imediatamente pelo catch block

