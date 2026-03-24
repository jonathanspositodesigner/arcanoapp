# Auditoria Completa v2: Bugs e Melhorias no Fluxo Mercado Pago

## Bugs Encontrados

### 🔴 CRÍTICO 1: Página de sucesso NÃO reconhece compras do Mercado Pago

A edge function `check-purchase-exists` (usada na página `/sucesso-compra`) consulta **apenas a tabela `asaas_orders**` (Pagar.me). Ela nunca verifica `mp_orders`. Quando o cliente paga via Mercado Pago e é redirecionado para `/sucesso-compra`, o sistema diz que a compra **não existe**, mostrando a tela de erro "Compra não encontrada". O onboarding (criação de senha) nunca acontece para clientes MP.

**Correção**: Adicionar fallback para `mp_orders` na função `check-purchase-exists`.

---

### 🔴 CRÍTICO 2: Sem tratamento de falha/pendência no redirecionamento

O `back_urls` envia para `/planos-upscaler-arcano-69?mp_status=failure` e `?mp_status=pending`, mas **não existe nenhum código** na página 69 que leia esse parâmetro e mostre feedback ao usuário. O cliente volta para a página de planos sem saber o que aconteceu.

**Correção**: Ler `mp_status` da URL na página 69 e exibir toast/alerta ("Pagamento não concluído" ou "Pagamento pendente, aguarde confirmação").

---

### 🟡 MÉDIO 3: Dashboard duplica vendas MP

A função `get_unified_dashboard_orders` puxa vendas da `mp_orders` diretamente **E** exclui `mercadopago` do `webhook_logs`. Isso está correto. Porém, o webhook agora insere em `webhook_logs` com `platform = 'mercadopago'`, e a cláusula `NOT IN ('pagarme', 'mercadopago')` filtra isso. Está OK — sem duplicação. Validado.

---

---

### 🟡 MÉDIO 5: Dedup do email de compra usa `productName` em vez de `orderId`

A `dedupKey` é `mp_purchase_${productName}`. Se o mesmo cliente comprar o mesmo produto 2 vezes (ex: pacote de créditos Starter), o segundo email **não será enviado** porque a dedup key é idêntica. Deveria usar o `order.id` como parte da chave.

**Correção**: Mudar para `mp_purchase_${order.id}`.

---

### 🟡 MÉDIO 6: Modal não reseta campos ao fechar

O `MPEmailModal` não limpa `name`, `email`, `cpf` e `errors` quando é fechado. Se o cliente abre o modal, preenche parcialmente, fecha e reabre, os dados antigos permanecem.

**Correção**: Adicionar `useEffect` que reseta os estados quando `open` muda para `true`.

---

### 🟢 MENOR 7: Sem rate limiting no create-mp-checkout

O `create-mp-checkout` não tem nenhuma proteção contra spam. Um usuário pode clicar 100 vezes e criar 100 ordens pendentes + 100 preferências no MP. Os outros checkouts (Pagar.me) têm rate limiting via RPC `check_rate_limit`.

**Correção**: Adicionar `check_rate_limit` (5 req/min por email) antes de criar a ordem.

---

### 🟢 MENOR 8: `event_id` do InitiateCheckout não é sincronizado browser/server

No frontend (`mpCheckout.ts`), o `eventId` é `ic_mp_${Date.now()}`. No backend (`create-mp-checkout`), outro `eventId` é gerado com `ic_mp_${Date.now()}` — mas são timestamps diferentes. A Meta precisa do **mesmo `event_id**` no Pixel e no CAPI para deduplicar. Atualmente, a Meta conta como 2 eventos separados.

**Correção**: Gerar o `eventId` no frontend e enviá-lo no body para o backend usar o mesmo.

---

### 🟢 MENOR 9: Webhook não trata `merchant_order` corretamente

O webhook aceita `type === 'merchant_order'` mas tenta buscar como payment (`/v1/payments/${paymentId}`). Merchant orders usam outro endpoint (`/v1/merchant_orders/`). Isso causa erro 404 silencioso.

**Correção**: Ignorar `merchant_order` ou tratar com o endpoint correto.

---

## Resumo de Ações


| #   | Severidade | Ação                                             | Arquivo                                             | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| --- | ---------- | ------------------------------------------------ | --------------------------------------------------- | ------ | ------ | ------ | ------ | ------ | ------ |
| 1   | CRÍTICO    | Adicionar `mp_orders` ao `check-purchase-exists` | `supabase/functions/check-purchase-exists/index.ts` | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| 2   | CRÍTICO    | Ler `mp_status` e mostrar feedback na página 69  | `src/pages/PlanosUpscalerArcano69v2.tsx`            | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| 3   | —          | Validado, sem ação                               | —                                                   | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| 4   | &nbsp;     | &nbsp;                                           | &nbsp;                                              | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| 5   | MÉDIO      | Usar `order.id` na dedup key do email            | `supabase/functions/webhook-mercadopago/index.ts`   | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| 6   | MÉDIO      | Reset de campos ao reabrir modal                 | `src/components/checkout/MPEmailModal.tsx`          | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| 7   | MENOR      | Adicionar rate limiting                          | `supabase/functions/create-mp-checkout/index.ts`    | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| 8   | MENOR      | Sincronizar `event_id` entre Pixel e CAPI        | `src/lib/mpCheckout.ts` + `create-mp-checkout`      | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| 9   | MENOR      | Ignorar `merchant_order` no webhook              | `supabase/functions/webhook-mercadopago/index.ts`   | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
