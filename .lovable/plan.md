

# Fix: Checkout Pagar.me quebrado - `PAGARME_API_URL` não definido

## Causa raiz

Na edge function `create-pagarme-checkout/index.ts`, linha 277, o código usa `PAGARME_API_URL` mas essa constante **nunca foi declarada** no arquivo. Isso causa um `ReferenceError` que faz TODOS os checkouts falharem.

Os logs confirmam:
```
ERROR Erro geral: ReferenceError: PAGARME_API_URL is not defined
```

Isso provavelmente foi perdido em alguma edição anterior do arquivo.

## Correção

### Arquivo: `supabase/functions/create-pagarme-checkout/index.ts`

Adicionar a constante `PAGARME_API_URL` no topo do arquivo (após os imports, antes do `serve`):

```typescript
const PAGARME_API_URL = 'https://api.pagar.me/core/v5'
```

### Robustez adicional

Além de corrigir o bug, vou adicionar:

1. **Try-catch específico** ao redor da chamada Pagar.me com mensagem de erro mais descritiva
2. **Validação** de que a URL da API está definida antes de tentar a chamada
3. **Timeout** na chamada fetch ao Pagar.me (30s) para evitar travamentos eternos
4. **Log de diagnóstico** com o prefixo da chave para facilitar debug futuro

Nenhuma alteração na lógica de negócios - apenas restaurar a constante que sumiu e adicionar proteções.

