

# Auditoria v6: Fluxo Completo Mercado Pago — Bugs Restantes

## ✅ O que está correto

| Item | Status |
|---|---|
| Criação de checkout com payer completo (nome/email/CPF) | ✅ |
| Rate limiting (5/min por email) | ✅ |
| Idempotência via `webhook_logs.transaction_id` | ✅ |
| Créditos adicionados via `add_lifetime_credits` com lock | ✅ |
| Pack `upscaller-arcano` inserido para planos de créditos | ✅ |
| Vitalício insere pack com `access_type: vitalicio` | ✅ |
| Reembolso revoga créditos E pack (inclusive `access_type: credits`) | ✅ |
| Meta CAPI Purchase com `event_id` sincronizado | ✅ |
| Meta CAPI InitiateCheckout com `event_id` sincronizado Pixel/CAPI | ✅ |
| Email de compra com template por tipo (créditos vs vitalício) | ✅ |
| Dedup email usa `order.id` | ✅ |
| Admin notificado | ✅ |
| UTMify recebe dados de venda | ✅ |
| `check-purchase-exists` verifica `mp_orders` como fallback | ✅ |
| Back URLs corretas (`/sucesso-compra` e `/planos-upscaler-arcano-69`) | ✅ |
| Feedback `mp_status` na página 69 (toast de failure/pending) | ✅ |
| CTA link do email corrigido para ambos os slugs | ✅ |
| merchant_order ignorado no webhook | ✅ |
| Auto-cleanup de ordens pending duplicadas | ✅ |
| UI Starter mostra ✅ em todas as features | ✅ |
| `webhook_logs` inserido para vendas e reembolsos | ✅ |

---

## 🔴 BUG CRÍTICO: Onboarding pós-compra falha para clientes Mercado Pago

**Onde**: `supabase/functions/complete-purchase-onboarding/index.ts`, linhas 42-78

**Problema**: Quando o cliente do Mercado Pago chega na página `/sucesso-compra`, digita seu email e o sistema confirma que a compra existe (via `check-purchase-exists` que já verifica `mp_orders`). Se o cliente ainda não tem conta, vai para a etapa de criar senha. Ao submeter, a função `complete-purchase-onboarding` é chamada — mas ela **só consulta `asaas_orders`** para validar o pedido (linha 42-61). Como a compra está em `mp_orders`, retorna **"Nenhum pedido encontrado"** e o onboarding falha.

O cliente pagou, mas não consegue criar sua conta/senha na plataforma.

**Correção**: Adicionar fallback para `mp_orders` na função `complete-purchase-onboarding`, idêntico ao que já existe em `check-purchase-exists`. Se não encontrar em `asaas_orders`, buscar em `mp_orders` com `status = 'paid'`.

---

## 🟡 BUG MÉDIO: `listUsers()` sem paginação no onboarding

**Onde**: `complete-purchase-onboarding/index.ts`, linha 83

**Problema**: `listUsers()` sem parâmetros retorna no máximo 50 usuários (default). Se o email do cliente não estiver nos primeiros 50, o sistema assume que ele não existe e tenta criar um novo — o que falhará com "email_exists". O webhook do MP já usa paginação correta (até 10 páginas de 1000), mas o onboarding não.

**Correção**: Buscar primeiro em `profiles` por email (como o webhook faz). Se não encontrar, usar `listUsers` com paginação. Ou melhor: usar `supabase.auth.admin.getUserByEmail()` se disponível na versão do SDK.

---

## ✅ Resumo — Fluxo Completo Auditado

```text
FRONTEND                  CREATE-CHECKOUT           WEBHOOK-MP              SUCESSO-COMPRA
────────                  ───────────────           ──────────              ──────────────
Modal (nome/email/CPF)    Valida dados              Recebe notificação      check-purchase ✅ (mp_orders)
  ↓                       Rate limit ✅              Idempotência ✅          onboarding ❌ (só asaas_orders)
redirectToMPCheckout()    Busca mp_products ✅       Busca payment API MP     listUsers ⚠️ (sem paginação)
  ↓                       Cria mp_orders ✅          Cria/busca user ✅
Pixel InitiateCheckout    CAPI InitiateCheckout ✅   Upsert profile ✅
  ↓                       Cria preference MP ✅      Concede pack/créditos ✅
Redireciona para MP       Retorna checkout_url ✅    Email compra ✅
                                                    Admin email ✅
                                                    CAPI Purchase ✅
                                                    UTMify ✅
                                                    webhook_logs ✅
```

---

## Plano de Correção

### 1. Adicionar `mp_orders` ao `complete-purchase-onboarding` (CRÍTICO)

Após a busca em `asaas_orders` retornar vazia, fazer fallback:

```typescript
// Se não encontrou em asaas_orders, verificar mp_orders
if (!orders || orders.length === 0) {
  const { data: mpOrders } = await supabaseAdmin
    .from("mp_orders")
    .select("id, user_email, user_id, status")
    .eq("user_email", trimmedEmail)
    .eq("status", "paid")
    .limit(1);
  
  if (mpOrders && mpOrders.length > 0) {
    order = mpOrders[0];
    isMpOrder = true;
  } else {
    // retorna 404
  }
}
```

E no final, atualizar `mp_orders` em vez de `asaas_orders` quando `isMpOrder = true`.

### 2. Corrigir busca de usuário existente no onboarding (MÉDIO)

Trocar `listUsers()` por busca em `profiles` + paginação como fallback:

```typescript
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('id')
  .ilike('email', trimmedEmail)
  .maybeSingle();

if (profile) {
  userId = profile.id;
  // atualizar senha
} else {
  // criar novo usuário
}
```

## Arquivos a alterar

| Arquivo | Alteração |
|---|---|
| `supabase/functions/complete-purchase-onboarding/index.ts` | Fallback `mp_orders` + corrigir busca de usuário |

