

## Plano: Mensagem amigavel para erro de fila cheia (erro 421)

### Problema
Quando a API do servidor retorna erro 421 ("api queue limit reached"), a mensagem crua aparece pro usuario sem explicacao. Precisa mostrar uma mensagem clara dizendo que o servidor ta ocupado.

### Solucao

**1. Arquivo `src/utils/errorMessages.ts`**
- Adicionar um novo bloco de deteccao para erros de fila cheia/limite de API
- Detectar as strings: `queue limit`, `queue full`, `too many requests`, `rate limit`, `429`, `421`
- Mensagem amigavel: **"Servidor ocupado no momento"**
- Solucao: **"A fila de processamento esta cheia. Aguarde 2-3 minutos e tente novamente."**
- Posicionar ANTES do bloco generico de erros de conexao para garantir prioridade

**2. Arquivo `supabase/functions/runninghub-queue-manager/index.ts`**
- Na funcao `callRunningHubApi` (linha 1202), melhorar a mensagem de erro quando detectar `errorCode` 421 ou mensagem de queue limit
- Salvar no banco: `"api queue limit reached"` de forma padronizada para o frontend mapear corretamente

### Detalhes tecnicos

No `errorMessages.ts`, o novo bloco ficara assim:
```typescript
// Fila cheia / limite de API (erro 421)
if (error.includes('queue limit') || error.includes('queue full') || 
    error.includes('too many requests') || error.includes('rate limit') || 
    error.includes('429') || error.includes('421')) {
  return {
    message: 'Servidor ocupado no momento',
    solution: 'A fila de processamento esta cheia. Aguarde 2-3 minutos e tente novamente.'
  };
}
```

No `callRunningHubApi`, quando nao tem `taskId`, verificar se `data.errorCode` e 421 e padronizar a mensagem de erro salva no banco para `"api queue limit reached"`.

