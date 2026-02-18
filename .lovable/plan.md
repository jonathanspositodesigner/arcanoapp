
## Problema identificado e correção

### Causa raiz

Quando alguém compra o produto 159713 (Arcano Cloner) ou os produtos de créditos do Upscaler (156954, 156957, 156960):

1. O webhook adiciona créditos e ativa `premium_users` (isPremium = true)
2. Mas **nunca cria um registro em `user_pack_purchases`**
3. A home usa `userPacks` (de `user_pack_purchases`) para saber o que mostrar como "comprado"
4. Resultado: `userPacks` vazio → `hasToolAccess = false` → não mostra Ferramentas de IA
5. Como `isPremium = true`, `hasPromptsAccess = true` → mostra Biblioteca de Prompts errado

### O que será corrigido

**1. `supabase/functions/webhook-greenn-artes/index.ts`**

Na função `processCreditsWebhook()`, após adicionar os créditos, criar/atualizar registro em `user_pack_purchases` com o slug correto:

```
159713 → pack_slug: 'arcano-cloner',    access_type: 'vitalicio'
156954 → pack_slug: 'upscaller-arcano', access_type: 'vitalicio'
156957 → pack_slug: 'upscaller-arcano', access_type: 'vitalicio'
156960 → pack_slug: 'upscaller-arcano', access_type: 'vitalicio'
156946, 156948, 156952 → pack_slug: 'upscaller-arcano', access_type: 'vitalicio'
```

**2. `supabase/functions/webhook-greenn-creditos/index.ts`**

Mesma lógica: após adicionar créditos, criar `user_pack_purchases` com o slug correto para cada produto.

**3. `src/pages/Index.tsx`**

Dois ajustes no frontend:

- Adicionar `'arcano-cloner'` ao array `TOOL_SLUGS` (linha 23-28)
- Corrigir `hasPromptsAccess` para NÃO incluir usuários que só compraram ferramentas/créditos:

```typescript
const ALL_TOOL_SLUGS = [...TOOL_SLUGS, 'arcano-cloner'];
const hasToolOnlyPacks = userPacks.length > 0 && userPacks.every(p => ALL_TOOL_SLUGS.includes(p.pack_slug));
const hasPromptsAccess = isLoggedIn && isPremium && !hasToolOnlyPacks;
```

Comportamento após a correção:

| Quem comprou | Ferramentas de IA | Biblioteca de Prompts |
|---|---|---|
| Arcano Cloner (159713) | Aparece como comprado ✅ | Não aparece ✅ |
| Upscaler créditos (156954/57/60) | Aparece como comprado ✅ | Não aparece ✅ |
| Pacote puro de créditos (156946/48/52) | Aparece como comprado ✅ | Não aparece ✅ |
| Assinatura de prompts | Não interfere ✅ | Aparece como comprado ✅ |
| Usuário existente sem packs mas com premium | Não interfere ✅ | Mantém acesso ✅ |

### Impacto em usuários existentes

O registro `user_pack_purchases` será criado para **compras futuras**. Para o usuário de teste `valentina-colodete@...`, o webhook precisa ser reacionado (ou fazer um upsert manual). Após implementar, vou simular novamente a compra para corrigir o registro dela.

### Arquivos modificados

1. `supabase/functions/webhook-greenn-artes/index.ts` — adiciona criação de pack purchase após créditos
2. `supabase/functions/webhook-greenn-creditos/index.ts` — mesma lógica
3. `src/pages/Index.tsx` — corrige `TOOL_SLUGS` e `hasPromptsAccess`
