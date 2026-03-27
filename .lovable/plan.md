

## Diagnóstico

O banco de dados está **100% íntegro** — todos os 633 assinantes têm nome e email reais salvos na tabela `profiles`.

O problema está no **frontend** (`AdminPlanos2SubscribersTab.tsx`): a função `fetchPlanos2Users` busca os 633 user IDs e faz uma query `.in("id", userIds)` com todos eles de uma vez. Com 633 UUIDs (cada um com 36 caracteres), a URL gerada tem ~24KB, o que **excede o limite de URL do PostgREST** (~8KB). Isso faz a query de profiles **falhar silenciosamente** — retorna `null` em vez de um array — e o merge coloca string vazia em nome e email para todos.

## Correção

### Arquivo: `src/components/admin/AdminPlanos2SubscribersTab.tsx`

**Alterar a função `fetchPlanos2Users`** para dividir os userIds em chunks de 50 e fazer múltiplas queries:

```
1. Buscar planos2_subscriptions normalmente
2. Dividir os userIds em chunks de 50
3. Para cada chunk, fazer query .in("id", chunk) na tabela profiles
4. Concatenar todos os resultados de profiles
5. Fazer o merge normalmente
```

Isso garante que cada request tenha no máximo ~1.8KB de UUIDs na URL, bem dentro do limite.

### Código da correção (resumo)

```typescript
// Helper para chunking
const chunkArray = <T,>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

// Dentro de fetchPlanos2Users:
const userIds = data?.map(u => u.user_id) || [];
const chunks = chunkArray(userIds, 50);
const allProfiles = [];

for (const chunk of chunks) {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, email, phone")
    .in("id", chunk);
  if (profiles) allProfiles.push(...profiles);
}

// Merge usa allProfiles em vez de profiles
```

### Resultado
- Nomes e emails reais voltam a aparecer para TODOS os assinantes
- Sem criação de dados fictícios — apenas correção da query que estava falhando
- Zero impacto no banco de dados

