
## Diagnóstico Preciso

### Dados confirmados no banco
Todas as 3 usuárias de teste têm:
- `user_pack_purchases`: `pack_slug = 'arcano-cloner'`, `access_type = 'vitalicio'`, `is_active = true`
- `premium_users`: `is_active = true`, `billing_period = 'lifetime'`
- RPC `get_user_packs`: retorna corretamente o pack `arcano-cloner`

### Causa raiz identificada

A lógica no `Index.tsx` tem uma falha de condição de corrida / timing:

```typescript
// linha 91 - hasToolAccess
const hasToolAccess = isLoggedIn && userPacks.some(p => TOOL_SLUGS.includes(p.pack_slug));

// linha 94-95 - hasPromptsAccess
const hasToolOnlyPacks = userPacks.length > 0 && userPacks.every(p => TOOL_SLUGS.includes(p.pack_slug));
const hasPromptsAccess = isLoggedIn && isPremium && !hasToolOnlyPacks;
```

O problema: enquanto os dados carregam, existe um momento onde `isPremium = true` mas `userPacks = []` (ainda não chegou do banco). Nesse momento:
- `hasToolOnlyPacks = false` (array vazio → `.length > 0` é false)
- `hasPromptsAccess = true && true && !false = true` → **mostra Biblioteca de Prompts errado**
- `hasToolAccess = false` (array vazio) → **não mostra Ferramentas de IA**

Além disso, há o `isLoading` que combina `isPremiumLoading || isPacksLoading` — mas o `isPremium` pode resolver antes dos `userPacks`, causando um flash de estado incorreto.

### Solução: simplificar totalmente a lógica de acesso

A lógica correta é direta e sem ambiguidade:

**Ferramentas de IA** → mostrar se tem qualquer pack em `TOOL_SLUGS`
**Biblioteca de Prompts** → mostrar se `isPremium = true` E NÃO tem apenas packs de ferramenta
**Artes** → mostrar se tem qualquer pack em `ARTES_SLUGS`

O que muda: aguardar que AMBOS (`isPremium` e `userPacks`) estejam carregados antes de calcular qualquer acesso. Isso é garantido usando `isLoading` corretamente como guard.

### Arquivo modificado: `src/pages/Index.tsx`

**Mudança 1 — linha 55-56:** garantir que o `isLoading` cubra os dois estados antes de qualquer cálculo

**Mudança 2 — linhas 91-95:** reescrever a lógica de acesso para ser baseada exclusivamente nos dados já carregados, usando um guard explícito:

```typescript
// Só calcula acessos depois que TUDO carregou
const isLoading = isPremiumLoading || isPacksLoading;

// Quando ainda carregando, todos os acessos são false (evita flash)
const hasToolAccess  = !isLoading && isLoggedIn && userPacks.some(p => TOOL_SLUGS.includes(p.pack_slug));
const hasArtesAccess = !isLoading && isLoggedIn && userPacks.some(p => ARTES_SLUGS.includes(p.pack_slug));

// Prompts: premium SIM, mas não se TODOS os packs são de ferramenta
// E só calcula depois que tudo carregou (evita o flash do estado intermediário)
const hasToolOnlyPacks = userPacks.length > 0 && userPacks.every(p => TOOL_SLUGS.includes(p.pack_slug));
const hasPromptsAccess = !isLoading && isLoggedIn && isPremium && !hasToolOnlyPacks;
```

**Mudança 3 — mover `isLoading` para antes dos cálculos de acesso** (atualmente está na linha 156, depois dos cálculos nas linhas 91-95, o que significa que os cálculos acontecem com dados incompletos):

```typescript
// ANTES (atual — bugado):
const hasToolAccess = ...   // linha 91 — calcula com dados que podem estar incompletos
const isLoading = isPremiumLoading || isPacksLoading;  // linha 156 — só definido depois!

// DEPOIS (correto):
const isLoading = isPremiumLoading || isPacksLoading;  // definir PRIMEIRO
const hasToolAccess = !isLoading && ...               // só calcula quando tudo carregou
```

### Resultado esperado

| Usuário | Ferramentas de IA | Biblioteca de Prompts |
|---|---|---|
| Compradora Arcano Cloner | Aparece como comprado (verde) | Não aparece |
| Compradora Upscaler Arcano | Aparece como comprado (verde) | Não aparece |
| Assinante mensal (sem packs) | Não aparece | Aparece como comprado (verde) |
| Assinante mensal + upscaler | Aparece como comprado (verde) | Aparece como comprado (verde) |

### Único arquivo modificado
- `src/pages/Index.tsx` — reorganizar e adicionar `!isLoading` guard nas linhas de cálculo de acesso
