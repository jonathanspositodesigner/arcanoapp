

## Plano: Corrigir bug — Instagram do colaborador não aparece nos prompts

### Problema real

A edge function `approve-collaborator/index.ts` busca todos os dados da `solicitacoes_colaboradores` (incluindo `instagram`), mas na **linha 118** ao criar o registro na tabela `partners`, **não inclui o campo `instagram`**. Resultado: o parceiro é criado com `instagram: NULL`.

Na `BibliotecaPrompts.tsx` (linha 509), quando `instagram` é null, o `getPromptAuthor` retorna `null`, ocultando completamente o badge do autor no prompt.

### Mudanças

**1. Corrigir `approve-collaborator/index.ts` — incluir instagram no upsert**

Linha 118, adicionar `instagram: sol.instagram || null` ao objeto de upsert:

```typescript
.upsert({
  user_id: userId,
  name: sol.nome,
  email: sol.email,
  phone: sol.whatsapp || null,
  instagram: sol.instagram || null,  // ← FALTAVA
  is_active: true,
}, { onConflict: "user_id" })
```

**2. Corrigir dados da colaboradora no banco (correção imediata)**

Atualizar o registro da parceira `hericanagila53@gmail.com` para copiar o instagram que já existe na `solicitacoes_colaboradores`:

```sql
UPDATE partners SET instagram = 'Herica.nagila' 
WHERE email = 'hericanagila53@gmail.com';
```

**3. Corrigir `BibliotecaPrompts.tsx` — exibir autor mesmo sem Instagram**

Na função `getPromptAuthor` (linha 509), em vez de retornar `null` quando não há Instagram, retornar o autor com `instagram: null` para que pelo menos o nome e avatar (ou placeholder) apareçam no prompt:

```typescript
// ANTES: if (!instagram) return null;
// DEPOIS: retorna o autor sempre para prompts de parceiros
return {
  name: item.partnerName || fallbackPartner?.name || 'Colaborador',
  instagram: instagram || null,
  avatarUrl: item.partnerAvatarUrl || fallbackPartner?.avatar_url || undefined,
};
```

E ajustar os renders (linhas 738 e 907) para exibir o badge do autor com placeholder quando não houver Instagram — mostrando o nome/avatar sem o link do Instagram.

**4. Corrigir retroativamente todos os parceiros sem Instagram**

Executar query para copiar o Instagram de `solicitacoes_colaboradores` para todos os `partners` que estejam com campo NULL:

```sql
UPDATE partners p 
SET instagram = sc.instagram 
FROM solicitacoes_colaboradores sc 
WHERE sc.email = p.email 
  AND p.instagram IS NULL 
  AND sc.instagram IS NOT NULL;
```

### Arquivos editados
- `supabase/functions/approve-collaborator/index.ts` — adicionar campo `instagram` no upsert
- `src/pages/BibliotecaPrompts.tsx` — nunca ocultar autor por falta de Instagram
- Banco de dados — correção retroativa dos dados

