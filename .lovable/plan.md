

# Plano: Substituir selects unbounded de arte_clicks e prompt_clicks por RPCs agregadas

## Resumo

Existem 5 locais que fazem `select('arte_id')` ou `select('prompt_id')` sem limite nas tabelas de clicks, baixando TODAS as linhas e contando no client. A RPC `get_prompt_click_counts` ja existe e e usada em `useOptimizedPrompts.ts`. Preciso criar `get_arte_click_counts` equivalente e substituir todos os selects unbounded.

## Mudancas

### 1. Criar RPC `get_arte_click_counts` (migracao SQL)

```sql
CREATE OR REPLACE FUNCTION public.get_arte_click_counts()
RETURNS TABLE(arte_id text, click_count bigint)
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  SELECT arte_id, COUNT(*)::bigint as click_count
  FROM arte_clicks
  GROUP BY arte_id;
$$;
```

### 2. Substituir selects unbounded em 5 arquivos

**`src/pages/BibliotecaArtes.tsx`** (linha ~211):
- De: `supabase.from('arte_clicks').select('arte_id')`
- Para: `supabase.rpc('get_arte_click_counts')`
- Ajustar parsing: `data.forEach(d => clickCounts[d.arte_id] = d.click_count)`

**`src/pages/AdminManageArtes.tsx`** (linha ~157):
- Mesma substituicao por `rpc('get_arte_click_counts')`

**`src/pages/AdminManageArtesMusicos.tsx`** (linha ~138):
- Mesma substituicao por `rpc('get_arte_click_counts')`

**`src/pages/AdminManageImages.tsx`** (linha ~149-151):
- De: `supabase.from('prompt_clicks').select('prompt_id')`
- Para: `supabase.rpc('get_prompt_click_counts')`
- Ajustar parsing para usar `d.click_count` direto

**`src/pages/PartnerDashboard.tsx`** (linha ~119-122):
- De: `supabase.from('prompt_clicks').select('prompt_id').in('prompt_id', promptIds)`
- Para: `supabase.rpc('get_prompt_click_counts')` + filtrar no client pelos promptIds do partner

## Impacto

| Metrica | Antes | Depois |
|---------|-------|--------|
| arte_clicks payload | N linhas brutas | ~M linhas agregadas (1 por arte) |
| prompt_clicks payload | N linhas brutas | ~M linhas agregadas (1 por prompt) |
| Processamento | COUNT no browser | COUNT no banco (otimizado) |
| Risco de hit no limite 1000 rows | Alto (dados crescem) | Zero (agregado) |

Zero risco de quebra — mesmos dados, formato ligeiramente diferente no parsing.

