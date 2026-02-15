
# Correção: Resolução do teste gratuito de 2K para 4K

## Problema
O upscaler do teste gratuito está hardcoded para enviar resolução `2048` (2K). Precisa enviar `4096` (4K).

## Correção

### Arquivo: `src/components/upscaler/trial/UpscalerTrialSection.tsx`

Duas alterações simples:

1. **Linha 239** (insert no banco `upscaler_jobs`): Trocar `resolution: isSpecialWorkflow ? null : 2048` por `resolution: isSpecialWorkflow ? null : 4096`

2. **Linha 278** (chamada da Edge Function `runninghub-upscaler/run`): Trocar `resolution: isSpecialWorkflow ? undefined : 2048` por `resolution: isSpecialWorkflow ? undefined : 4096`

Isso faz o teste gratuito usar a mesma resolução 4K do app principal.
