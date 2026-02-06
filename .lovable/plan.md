
## Problema Identificado

O erro "Failed to send a request to the Edge Function" é causado por **código inválido** nas edge functions que usa `EdgeRuntime.waitUntil()`.

**`EdgeRuntime` não existe no Supabase Edge Functions (Deno)** - isso é API do Vercel. Quando a função tenta executar isso, ela crasha imediatamente.

---

## O que precisa ser removido

Blocos de código com `EdgeRuntime.waitUntil()` em 4 arquivos:

| Arquivo | Linhas | Código a remover |
|---------|--------|------------------|
| `runninghub-upscaler/index.ts` | 893-911 | Bloco TIMEOUT SAFETY |
| `runninghub-pose-changer/index.ts` | 708-726 | Bloco TIMEOUT SAFETY |
| `runninghub-veste-ai/index.ts` | 731-749 | Bloco TIMEOUT SAFETY |
| `runninghub-video-upscaler/index.ts` | 377-395 | Bloco TIMEOUT SAFETY |

---

## Nota importante

O timeout de 10 minutos para jobs travados **já funciona** via RPC no banco de dados (`cleanup_all_stale_ai_jobs`). Esse código dentro das edge functions era redundante e incorreto.

---

## Ações

1. Remover o bloco `EdgeRuntime.waitUntil()` das 4 edge functions
2. Redeployar as funções

---

## Resultado

- Upscaler voltará a funcionar
- Pose Changer voltará a funcionar  
- Veste AI voltará a funcionar
- Video Upscaler voltará a funcionar
