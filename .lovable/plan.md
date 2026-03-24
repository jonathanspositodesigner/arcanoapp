

# Auditoria Completa: Fluxo Mercado Pago na página `/planos-upscaler-arcano-69`

## Resumo da Jornada Atual

```text
CLIENTE                          BACKEND                           PÓS-VENDA
─────────                        ───────                           ─────────
Clica "Comprar Agora"            Edge: create-mp-checkout           Webhook: webhook-mercadopago
  → Abre modal (Nome/Email/CPF)   → Busca produto mp_products       → MP envia notificação
  → Valida CPF (checksum)          → Cria ordem mp_orders(pending)   → Busca payment na API MP
  → Chama edge function            → Cria preference no MP           → Se approved:
  → Redireciona para checkout MP   → Retorna checkout_url              - Cria/busca usuário
                                   → Meta CAPI InitiateCheckout        - Ativa pack ou créditos
                                                                       - Envia email compra
                                                                       - Notifica admin
                                                                       - Envia UTMify
                                                                     → Se refunded:
                                                                       - Revoga acesso/créditos
```

---

## Problemas e Lacunas Encontrados

### 🔴 CRÍTICO 1: Sem evento Meta CAPI "Purchase" no webhook
O webhook `webhook-mercadopago` **não envia** o evento `Purchase` para a Meta Conversions API quando o pagamento é aprovado. Só existe o `InitiateCheckout` na criação do checkout. Isso significa que **nenhuma compra via Mercado Pago é rastreada como conversão** nos anúncios do Meta/Facebook. Todas as outras plataformas (Greenn, Pagar.me, Hotmart) enviam Purchase via CAPI — o Mercado Pago é a exceção.

### 🔴 CRÍTICO 2: Redirecionamento pós-pagamento vai para página errada
O `back_urls.success` está configurado como:
```
https://arcanoapp.lovable.app/ferramentas-ia?mp_status=success
```
- Não existe nenhum tratamento de `mp_status` na página `/ferramentas-ia`
- Deveria redirecionar para `/sucesso-compra` ou `/sucesso-upscaler-arcano` (que já existem)
- O cliente paga e cai numa página genérica sem feedback de compra confirmada

### 🔴 CRÍTICO 3: Sem registro em `webhook_logs`
O webhook do Mercado Pago **não insere nada na tabela `webhook_logs`**. O dashboard de vendas (`AdminWebhookLogs`, `AdminFerramentas`, `AdminPremiumDashboard`) consulta `webhook_logs` para mostrar vendas, reembolsos e métricas. Vendas do MP são **invisíveis** no painel admin e nos monitores de email.

### 🟡 MÉDIO 4: Sem idempotência no webhook
O webhook não verifica se já processou aquele `paymentId`. Se o Mercado Pago reenviar a mesma notificação (o que é comum), o sistema tenta processar novamente. O check `order.status === 'pending'` protege parcialmente, mas não há log de dedup como nos outros webhooks (que usam `webhook_logs.transaction_id`).

### 🟡 MÉDIO 5: Dados de atribuição (fbp/fbc) não são persistidos na ordem
O `create-mp-checkout` recebe `fbp`, `fbc`, `user_agent` mas **não salva** na `mp_orders`. Quando o webhook processa a compra e precisa enviar o evento `Purchase` para a Meta CAPI, esses dados já não existem mais. Os outros webhooks (Greenn, Pagar.me) usam dados persistidos na ordem/webhook_logs para enviar Purchase com atribuição correta.

### 🟡 MÉDIO 6: Email de compra assume sempre "Acesso Vitalício"
O template de email (`buildPurchaseEmailHtml`) diz "🎉 Acesso Vitalício Ativado!" para **todos** os produtos, incluindo Starter (25 imagens), Pro (70 imagens) e Ultimate (233 imagens) que são pacotes de créditos avulsos — não vitalícios.

### 🟢 MENOR 7: `customerName` vazio na notificação admin
Na chamada `sendAdminSaleNotification`, o campo `customerName` é hardcoded como `''`. O nome do cliente está disponível na ordem (foi coletado no modal) mas não é salvo em `mp_orders` e portanto não chega ao webhook.

### 🟢 MENOR 8: Slug vitalício com typo
Na página 69 o slug é `upscaler-arcano-vitalicio` (correto), mas na outra página `PlanosUpscalerArcano.tsx` pode existir `upscaller-arcano-vitalicio` (com "ll"). Se ambas usam a mesma tabela `mp_products`, pode causar "Produto não encontrado" dependendo do slug cadastrado.

---

## O que está funcionando corretamente ✅

| Item | Status |
|---|---|
| Coleta de Nome/Email/CPF real (sem dados fake) | ✅ OK |
| Validação de CPF com checksum | ✅ OK |
| Criação de preferência MP com payer completo | ✅ OK |
| Criação de usuário (ou busca existente) no webhook | ✅ OK |
| Ativação de pack (user_pack_purchases) | ✅ OK |
| Adição de créditos (para tipo "credits") | ✅ OK |
| Revogação de acesso em reembolso/chargeback | ✅ OK |
| Revogação de créditos em reembolso | ✅ OK (usa RPC segura) |
| Email de compra com retry (3 tentativas + backoff) | ✅ OK |
| Dedup de email de compra (welcome_email_logs) | ✅ OK |
| UTMify webhook para atribuição de vendas | ✅ OK |
| Proteção contra créditos duplicados (check pack existente) | ✅ OK |
| Meta Pixel InitiateCheckout (browser-side) | ✅ OK |
| Meta CAPI InitiateCheckout (server-side) | ✅ OK |
| Timeout com AbortController no frontend | ✅ OK |

---

## Plano de Correção

### 1. Adicionar Meta CAPI Purchase no webhook
Quando `paymentStatus === 'approved'`, após conceder acesso, enviar evento `Purchase` para a Meta CAPI com dados do produto, valor, email hashado. Usar os dados de atribuição persistidos (ver item 5).

### 2. Corrigir back_urls para página de sucesso
Trocar:
```
success: 'https://arcanoapp.lovable.app/sucesso-compra?gateway=mercadopago'
failure: 'https://arcanoapp.lovable.app/planos-upscaler-arcano-69?mp_status=failure'
pending: 'https://arcanoapp.lovable.app/planos-upscaler-arcano-69?mp_status=pending'
```

### 3. Inserir registro em `webhook_logs`
Para cada notificação processada, inserir em `webhook_logs` com os campos padrão (`status`, `email`, `platform: 'mercadopago'`, `amount`, `product_id`, `transaction_id`, etc.) para que as vendas apareçam no painel admin.

### 4. Adicionar idempotência via `webhook_logs`
Antes de processar, verificar se `transaction_id` (paymentId) já existe em `webhook_logs`. Se sim, pular.

### 5. Persistir fbp/fbc/user_agent na mp_orders
Salvar esses campos na criação da ordem para que o webhook tenha acesso a eles ao enviar o Purchase CAPI.

### 6. Corrigir template de email por tipo de produto
Se `product.type === 'credits'` → mensagem de créditos. Se `product.type === 'pack'` com acesso vitalício → mensagem de vitalício.

### 7. Salvar e propagar `user_name` na ordem
Salvar `user_name` em `mp_orders` no create-checkout e usar no webhook para email admin e CAPI.

## Arquivos a alterar

| Arquivo | Alterações |
|---|---|
| `supabase/functions/create-mp-checkout/index.ts` | Corrigir back_urls; salvar fbp/fbc/user_agent/user_name na mp_orders |
| `supabase/functions/webhook-mercadopago/index.ts` | Adicionar Meta CAPI Purchase; inserir webhook_logs; idempotência; corrigir email template por tipo; usar user_name |
| Migração SQL | Adicionar colunas `fbp`, `fbc`, `user_agent`, `user_name` na tabela `mp_orders` |

