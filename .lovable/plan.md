

# Corrigir Dashboard Premium - Mostrar Usuarios Free e Localizar Arcano Unlimited

## Problema Identificado

Encontrei **2 problemas**:

### 1. Usuarios Free filtrados (28 usuarios escondidos!)
No arquivo `AdminPlanos2SubscribersTab.tsx`, linha 111, existe um filtro que **exclui todos os usuarios free**:
```
.neq("plan_slug", "free")
```
Isso esta escondendo 28 usuarios free da lista. Precisa remover esse filtro.

### 2. Usuario "Arcano IA Unlimited" esta na aba errada
O usuario que voce adicionou como "arcano_unlimited" foi cadastrado no sistema antigo (tabela `premium_users`), que aparece na aba **"Assinantes Antigos"**, nao na aba **"Assinantes"** (que mostra apenas `planos2_subscriptions`). O usuario existe no banco -- user_id `8bb43ae1`, cadastrado em 24/02 com plano `arcano_unlimited`.

## Solucao

### Arquivo: `src/components/admin/AdminPlanos2SubscribersTab.tsx`

**Remover o filtro `.neq("plan_slug", "free")`** na funcao `fetchPlanos2Users` (linha 111), para que todos os usuarios aparecam, incluindo os free.

Antes:
```typescript
const { data, error } = await supabase
  .from("planos2_subscriptions")
  .select("*")
  .neq("plan_slug", "free")
  .order("created_at", { ascending: false });
```

Depois:
```typescript
const { data, error } = await supabase
  .from("planos2_subscriptions")
  .select("*")
  .order("created_at", { ascending: false });
```

### Adicionar filtro por plano na interface

Adicionar um select para filtrar por tipo de plano (Free, Starter, Pro, Ultimate, Unlimited, Todos) na barra de filtros, para que o admin possa facilmente ver so os pagantes ou so os free quando quiser.

### Ajustar metricas

As metricas no topo ja consideram corretamente que free nao e "ativo pagante" (linha 468: `u.plan_slug !== 'free'`), entao os cards de resumo continuarao mostrando numeros corretos mesmo com os free aparecendo na lista.

### Nenhuma alteracao no backend

Apenas remocao do filtro no frontend. Nenhuma migration necessaria.

