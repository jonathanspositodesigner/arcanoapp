

## Problema identificado

A Edge Function `check-purchase-exists` busca na tabela `asaas_orders` mas **não filtra por status**. Quando o checkout Pagar.me é criado, já insere uma ordem com `status: 'pending'`. Então quando o usuário chega na página de sucesso sem ter pago:

1. Digita o email → `check-purchase-exists` encontra a ordem `pending` → retorna `exists: true`
2. `check_profile_exists` encontra o perfil (já existia) → redireciona para Home
3. Resultado: usuário que **não pagou** é redirecionado como se tivesse pago

## Correção

### 1. `check-purchase-exists` — filtrar por status `paid`

Adicionar filtro `.eq('status', 'paid')` em TODAS as queries da Edge Function. Assim, ordens `pending` (não pagas) não serão encontradas, e a página mostrará corretamente "Nenhuma compra encontrada" com o botão do WhatsApp.

**Arquivo:** `supabase/functions/check-purchase-exists/index.ts`

Queries afetadas:
- Query principal (por email) → adicionar `.eq('status', 'paid')`
- Query com order_id UUID → adicionar `.eq('status', 'paid')`
- Query com order_id string → adicionar `.eq('status', 'paid')`
- Query fallback (só email) → adicionar `.eq('status', 'paid')`

### 2. Nenhuma mudança no frontend

A lógica do `SucessoCompra.tsx` já está correta:
- `exists: false` → mostra "Nenhuma compra encontrada" com botão WhatsApp ✅
- `exists: true` + perfil com senha → redireciona para Home ✅
- `exists: true` + sem perfil → pede criar senha ✅

O problema é **100% na Edge Function** que retorna `exists: true` para ordens não pagas.

### Impacto

Essa correção vale para **todos os produtos** (packs normais, membro, renovação, upscaler, etc.) porque todos passam pelo mesmo `check-purchase-exists`.

