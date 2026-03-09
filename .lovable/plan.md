

## Problema

O `handleRefresh` chama `refetch()` que apenas incrementa `refreshKey` (dispara o `useEffect`), mas imediatamente depois executa `setIsRefreshing(false)` e mostra o toast **sem esperar** os dados novos carregarem. O `useEffect` roda de forma assíncrona em background — o botão para de girar e mostra "Dados atualizados!" antes dos dados terem sido recarregados de verdade.

Além disso, o `supabase.functions.invoke("fetch-meta-ads")` pode estar retornando antes dos dados serem commitados no banco.

## Correção

**Arquivo: `src/components/admin/sales-dashboard/useSalesDashboard.ts`**

Transformar o `refetch` de um simples incremento de `refreshKey` para uma função assíncrona que executa todo o `fetchData` e retorna uma Promise. Assim o `handleRefresh` pode fazer `await refetch()` e só depois mostrar o toast.

```typescript
// Expor fetchData como refetch retornando Promise
const fetchData = useCallback(async () => {
  setIsLoading(true);
  try {
    // ... toda a lógica de fetch atual ...
  } finally {
    setIsLoading(false);
  }
}, [start, end]);

// useEffect chama fetchData na montagem e quando muda período
useEffect(() => { fetchData(); }, [fetchData]);

// retornar fetchData como refetch
return { ..., refetch: fetchData };
```

**Arquivo: `src/components/admin/sales-dashboard/SalesDashboard.tsx`**

Fazer `await refetch()` no handleRefresh para garantir que os dados só são marcados como atualizados após recarregar tudo:

```typescript
const handleRefresh = useCallback(async () => {
  setIsRefreshing(true);
  try {
    await supabase.functions.invoke("fetch-meta-ads");
    await refetch(); // ESPERA dados carregarem
    toast.success("Dados atualizados!");
  } catch (e) {
    console.error("Error refreshing:", e);
    toast.error("Erro ao atualizar dados");
  } finally {
    setIsRefreshing(false);
  }
}, [refetch]);
```

Isso garante que: Meta Ads sincroniza → dados recarregam do banco → toast aparece.

