

# Integração UTMify para vendas Mercado Pago

## O que vamos fazer

Quando uma venda é aprovada pelo Mercado Pago, nosso sistema vai enviar um webhook para o UTMify **no mesmo formato que a Greenn envia**, para que o UTMify consiga ler e atribuir corretamente ao anúncio.

## Mudanças necessárias

### 1. Migração SQL: coluna `utm_data` na tabela `mp_orders`
Adicionar coluna JSONB para armazenar as UTMs que vieram do anúncio junto com o pedido.

### 2. Frontend: todas as páginas que chamam `create-mp-checkout`
Ler UTMs do `sessionStorage` (já capturadas pelo `useUtmTracker`) e enviar no body da requisição. Atualmente só `PlanosUpscalerArcanoMP.tsx` usa, mas a lógica será genérica para qualquer página futura.

### 3. Edge Function: `create-mp-checkout`
Aceitar `utm_data` no body e salvar na coluna `utm_data` da `mp_orders`.

### 4. Edge Function: `webhook-mercadopago`
Após pagamento aprovado, montar um payload no formato Greenn e enviar POST para `https://api.utmify.com.br/webhooks/greenn?id=677eeb043df9ee8a68e6995b`.

O payload será montado assim (imitando o formato Greenn que o UTMify já sabe ler):

```json
{
  "currentStatus": "paid",
  "client": {
    "name": "",
    "email": "comprador@email.com"
  },
  "product": {
    "name": "Upscaler Arcano Vitalício",
    "id": "mp_upscaller-arcano-vitalicio"
  },
  "sale": {
    "id": "order-uuid",
    "amount": 97.00,
    "created_at": "2026-03-09T..."
  },
  "saleMetas": [
    { "meta_key": "utm_source", "meta_value": "FB" },
    { "meta_key": "utm_campaign", "meta_value": "campanha|12345" },
    { "meta_key": "utm_medium", "meta_value": "conjunto|67890" },
    { "meta_key": "utm_content", "meta_value": "anuncio|11111" },
    { "meta_key": "utm_term", "meta_value": "feed" },
    { "meta_key": "xcod", "meta_value": "FBhQwK21wXxR..." }
  ]
}
```

Isso funciona para **todos os produtos** que passam pelo checkout do Mercado Pago, pois as UTMs são lidas dinamicamente da ordem e o nome/preço vem do produto cadastrado em `mp_products`.

### Arquivos editados
- 1 migração SQL (nova coluna `utm_data`)
- `src/pages/PlanosUpscalerArcanoMP.tsx` (enviar UTMs no checkout)
- `supabase/functions/create-mp-checkout/index.ts` (salvar UTMs)
- `supabase/functions/webhook-mercadopago/index.ts` (enviar webhook UTMify no formato Greenn)

