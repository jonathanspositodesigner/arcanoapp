

# Rastrear Vendas Pagar.me no Facebook via Conversions API (Server-Side)

## O Problema

Quando o usuário clica em "Comprar", ele é **redirecionado para o checkout externo do Pagar.me** (domínio diferente). Nesse momento, o Facebook Pixel do seu site **para de funcionar** porque:
- O Pixel só rastreia eventos no **seu domínio** (arcanoapp.lovable.app)
- Na página do Pagar.me, seu Pixel não existe
- O Facebook nunca recebe o evento "Purchase" → não atribui a venda à campanha

## A Solução: Meta Conversions API (CAPI)

Em vez de depender do Pixel no navegador, vamos enviar os eventos **direto do servidor** para o Facebook usando a Conversions API. Isso funciona mesmo quando o usuário está em outro site.

Você já tem os secrets necessários configurados: `META_ACCESS_TOKEN` e `META_APP_ID`.

### Fluxo atualizado:

```text
Usuário clica "Comprar"
       │
       ▼
[Front-end] ── fbq('InitiateCheckout') ── já funciona ✅
       │
       ▼
[create-pagarme-checkout] ── CAPI: InitiateCheckout ── NOVO 🆕
       │
       ▼
Usuário vai pro Pagar.me (Pixel perde rastreio ❌)
       │
       ▼
Pagar.me confirma pagamento
       │
       ▼
[webhook-pagarme] ── CAPI: Purchase ── NOVO 🆕
```

## Mudanças Técnicas

### 1. Nova Edge Function: `meta-capi-event`
Função reutilizável que envia eventos para a Meta Conversions API:
- Recebe: `event_name`, `email`, `value`, `currency`, `utm_data`, `fbp`, `fbc`, `event_id`
- Faz hash do email (SHA-256, exigido pela API)
- Envia para `https://graph.facebook.com/v21.0/{PIXEL_ID}/events`
- Usa o Pixel ID principal: `1162356848586894`
- Suporte a `event_id` para **deduplicação** com o Pixel do navegador (evita contar 2x)

### 2. Atualizar `create-pagarme-checkout`
- Após criar o checkout com sucesso, chamar `meta-capi-event` com evento `InitiateCheckout`
- Passar email, valor do produto, e UTMs da ordem
- Gerar `event_id` único e retorná-lo ao front-end

### 3. Atualizar `webhook-pagarme`
- Após confirmar pagamento (order.paid), chamar `meta-capi-event` com evento `Purchase`
- Passar email, valor, UTMs armazenados na ordem
- Isso garante que **toda venda confirmada** aparece no Facebook, independente do Pixel

### 4. Atualizar Front-end (PreCheckoutModal e páginas de planos)
- Capturar cookies `_fbp` e `_fbc` do navegador e enviar junto no body do checkout
- Passar `event_id` no `fbq('track', 'InitiateCheckout')` para deduplicação
- Isso permite que o Facebook "case" o evento do Pixel com o evento server-side

### 5. Atualizar `index.html`
- Incluir parâmetro `external_id` no Pixel init para melhorar o match rate

## Resultado Esperado
- **InitiateCheckout**: rastreado tanto pelo Pixel (browser) quanto pela CAPI (servidor) com deduplicação
- **Purchase**: rastreado **exclusivamente pela CAPI** (já que o Pixel não existe no checkout do Pagar.me), atribuído à campanha correta via UTMs e cookies fbp/fbc
- Vendas aparecerão no Gerenciador de Anúncios vinculadas à campanha/conjunto/anúncio correto

