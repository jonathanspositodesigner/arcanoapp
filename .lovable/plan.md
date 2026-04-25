# Correção raiz: `IMAGE_TRANSFER_ERROR: Connection refused` no Upscaler

## Diagnóstico (confirmado nos dados)

O bug está em `supabase/functions/runninghub-upscaler/index.ts`, função `fetchWithRetry` (linhas 149-198).

Quando o servidor da RunningHub recusa a conexão TCP, o `fetch` do Deno **lança uma exceção** (não retorna Response). O nosso retry só cobre:
- Status HTTP `[429, 502, 503, 504]`
- `AbortError` (timeout)

Qualquer outro erro (incluindo `Connection refused`, `ECONNRESET`, `fetch failed`, DNS, etc.) cai no `throw err` da linha 193 **sem nenhum retry**, matando o job na primeira piscada de rede da RunningHub.

5 jobs falharam em sequência hoje entre 14:12-14:14 por causa disso. A RunningHub voltou a operar normal logo depois (job `144ee800` rodou às 14:31).

## Correção (cirúrgica, escopo restrito)

### 1. `supabase/functions/runninghub-upscaler/index.ts` — função `fetchWithRetry`

Adicionar detecção de erros de rede transientes no `catch`, reaproveitando o backoff já existente:

```ts
} catch (err: any) {
  if (err.name === 'AbortError') {
    // ... lógica atual de timeout
    continue;
  }
  
  // NOVO: tratar erros de rede TCP/DNS como retryable
  const errMsg = err instanceof Error ? err.message : String(err);
  const isNetworkError = /connection refused|ECONNREFUSED|ECONNRESET|fetch failed|tcp connect|network|socket|dns error|os error 111/i.test(errMsg);
  
  if (isNetworkError && attempt < maxRetries - 1) {
    const jitter = Math.random() * 2000;
    const delay = (baseDelays[attempt] || 5000) + jitter;
    console.warn(`[RunningHub] ${context} network error: ${errMsg.slice(0,120)}, retrying in ${Math.round(delay)}ms (${attempt+1}/${maxRetries})`);
    await new Promise(r => setTimeout(r, delay));
    continue;
  }
  
  throw err;
}
```

Isso aplica os mesmos 6 retries (2s → 4s → 8s → 15s → 25s → 40s) que já temos para 5xx, agora também para falhas TCP.

### 2. Recovery dos jobs já queimados

Verificar se algum dos 5 jobs falhou DEPOIS de cobrar crédito (cobrança acontece nas linhas 661+, depois do upload). Pelo log, o erro morre **antes** do consumo de créditos, mas vou conferir e estornar se houver algum caso. Não tem usuário lesado nos 5 casos hoje (créditos ainda não foram debitados quando `image_transfer` falha).

### 3. Versão

Bump `APP_BUILD_VERSION` para `1.4.5` em `src/pages/Index.tsx`.

## Escopo NÃO incluído (deliberado)

- Não vou tocar em outros edge functions (Flux2, MovieLed, Cloner, etc.) nesta correção, mesmo eles podendo ter o mesmo padrão. Quero validar que a correção resolve o Upscaler antes de propagar. Se quiser, depois faço auditoria das outras.
- Não mexo no Queue Manager nem no webhook.

## Resultado esperado

Próxima vez que a RunningHub recusar conexão TCP, o upscaler vai tentar 6 vezes com backoff exponencial (~94 segundos no pior caso) antes de marcar o job como falho. Em 99% dos casos transientes (que duram segundos a 1-2 minutos), o job vai completar normalmente sem o usuário perceber.
