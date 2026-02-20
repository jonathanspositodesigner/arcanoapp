
## Corrigir erro "non-2xx status code" no Refinamento

### Problema identificado
Os logs da edge function mostram que o Google Gemini esta retornando `finishReason: "MALFORMED_FUNCTION_CALL"` em vez de gerar uma imagem. Isso acontece quando o modelo "se confunde" e tenta chamar funcoes internas dele (como inpainting, crop) em vez de gerar a imagem.

A edge function retorna HTTP 500 com a mensagem real, mas o `supabase.functions.invoke()` no frontend transforma qualquer resposta non-2xx na mensagem generica "Edge Function returned a non-2xx status code", escondendo o erro real.

### Solucao (2 arquivos)

**1. Edge function `supabase/functions/generate-image/index.ts`** (linhas 262-281)

- Detectar o `finishReason` da resposta do Gemini (`MALFORMED_FUNCTION_CALL`, `SAFETY`, `RECITATION`) e gerar mensagens amigaveis em portugues
- Mudar o status HTTP de 500 para **200** quando o erro e tratado (com campo `error` no JSON), para que o frontend consiga ler a mensagem real. Isso e necessario porque `supabase.functions.invoke` nao expoe o body de respostas non-2xx de forma confiavel
- Manter o estorno automatico de creditos (ja funciona)
- Adicionar campo `refunded: true` na resposta para o frontend saber que os creditos ja foram devolvidos

Mensagens por tipo de erro:
- `MALFORMED_FUNCTION_CALL`: "A IA nao conseguiu processar esta imagem. Tente usar um prompt diferente ou outra imagem de referencia. Seus creditos foram estornados."
- `SAFETY`: "Imagem bloqueada pelo filtro de seguranca. Tente usar outra imagem. Seus creditos foram estornados."
- `RECITATION`: "A IA detectou conteudo protegido por direitos autorais. Tente com outra imagem. Seus creditos foram estornados."
- Outros: "Nenhuma imagem gerada. Tente novamente com um prompt diferente. Seus creditos foram estornados."

**2. Frontend `src/pages/ArcanoClonerTool.tsx`** (linhas 646-650)

- Melhorar o tratamento de erro na funcao `handleRefine`:
  - Para erros non-2xx do `supabase.functions.invoke`, tentar extrair o body real via `error.context.json()`
  - Se nao conseguir extrair, mostrar mensagem generica amigavel em portugues: "Erro ao refinar imagem. Tente novamente."
  - Para erros retornados como 200 com `data.error`, mostrar a mensagem real da edge function (ja amigavel)
  - Substituir "Nenhuma imagem gerada" por "Nenhuma imagem gerada. Tente novamente."

### O que NAO muda
- A geracao normal de imagem NanoBanana continua igual
- O custo de 30 creditos do refinamento continua igual
- O estorno automatico continua funcionando
- A timeline de refinamento continua funcionando
