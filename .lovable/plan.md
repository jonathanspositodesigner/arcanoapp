

# Diagnóstico: IMAGE_TRANSFER_ERROR (502) no Arcano Cloner

## Causa Raiz

O erro ocorre na **etapa de upload da imagem do usuário para a API da RunningHub** (`https://www.runninghub.ai/task/openapi/upload`). O servidor da RunningHub retornou **502 Bad Gateway** em todas as 3 tentativas.

Cronologia dos dois jobs com falha:
1. Imagem baixada do Storage com sucesso
2. Tentativa de upload para RunningHub: 502
3. Retry 1 (500ms depois): 502
4. Retry 2 (1000ms depois): 502
5. Falha final apos 3 tentativas

## Causa: Instabilidade temporária do RunningHub

O 502 Bad Gateway indica que o servidor da RunningHub estava sobrecarregado ou em manutenção naquele momento. **Nao é um bug no nosso código.** As imagens estão comprimidas corretamente (JPEG, otimizadas pelo `optimizeForAI`).

## Problema Secundário: Retry insuficiente

Os delays de retry atuais sao muito curtos:
- Tentativa 1: espera 500ms
- Tentativa 2: espera 1000ms  
- Tentativa 3: espera 2000ms
- Total: ~3.5 segundos

Para um erro 502 (infraestrutura), isso é pouco tempo para recuperação.

## Solução Proposta

Aumentar a resiliência do retry na edge function `runninghub-arcano-cloner`:

1. **Aumentar delays de retry** de `[500, 1000, 2000]` para `[2000, 5000, 10000]` (backoff exponencial mais agressivo)
2. **Aumentar tentativas** de 3 para 4
3. **Aplicar a mesma correção** nas outras ferramentas que usam o mesmo padrão (pose-changer, veste-ai, upscaler, character-generator) para consistência

## Detalhes Técnicos

Arquivo modificado: `supabase/functions/runninghub-arcano-cloner/index.ts`

Alteração na funcao `fetchWithRetry`:
```text
// ANTES
maxRetries: number = 3
delays = [500, 1000, 2000]

// DEPOIS  
maxRetries: number = 4
delays = [2000, 5000, 10000, 15000]
```

Mesma alteração nos arquivos:
- `supabase/functions/runninghub-pose-changer/index.ts`
- `supabase/functions/runninghub-veste-ai/index.ts`
- `supabase/functions/runninghub-upscaler/index.ts`
- `supabase/functions/runninghub-character-generator/index.ts`

Tempo total de retry passa de ~3.5s para ~32s, dando tempo suficiente para o RunningHub se recuperar de instabilidades temporárias.

