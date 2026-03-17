

## Diagnostico Completo do Antifraude

### O que descobri analisando os dados reais

Analisei todos os webhooks de antifraude dos ultimos 7 dias:

- **9 transacoes reprovadas** pelo antifraude - TODAS do mesmo CPF (118.122.966-90) e mesmo cartao (****8341)
- **7 transacoes aprovadas** pelo antifraude - de clientes reais diferentes (merielenvieira02, cyellycosta, felipecavalcanti, labiberangel, zdmilani)

O antifraude **esta funcionando normalmente para clientes reais**. O seu cartao esta sendo reprovado porque:
1. Mesmo cartao usado com emails diferentes (jonathandesigner1993, momentus.loja, yasmine-bernadini@tuamaeaquelaursa.com, clara-pino@tuamaeaquelaursa.com)
2. Multiplas tentativas rapidas com o mesmo cartao
3. O machine learning do Pagar.me aprendeu esse padrao como suspeito

### O que a documentacao do Pagar.me exige

A doc oficial diz que para maxima aprovacao no antifraude, o pedido **deve conter**: `name`, `email`, `phones`, `document` (CPF), `type`, `items`, `address` ou `billing_address`.

Hoje no modo cartao, voce so envia `name`, `email` e `type`. O restante e coletado na pagina hospedada. Isso funciona, mas enviar os dados pre-preenchidos da mais score positivo pro antifraude.

### Plano de implementacao

**1. Frontend - `PreCheckoutModal.tsx`**
- Mostrar campos de **CPF** e **Celular** tambem quando o metodo for CREDIT_CARD (hoje so aparecem no PIX)
- Validar CPF e celular para cartao tambem

**2. Edge Function - `create-pagarme-checkout/index.ts`**
- Quando for cartao, enviar o objeto `customer` completo com: `name`, `email`, `document`, `document_type`, `phones.mobile_phone`
- Remover a flag `isPureCreditCardCheckout` que pula os dados pessoais
- Manter `customer_editable: true` e `billing_address_editable: true` para que o cliente possa corrigir dados no checkout hospedado

Resultado: o antifraude recebe mais dados desde o inicio, aumentando a chance de score "low" em vez de "moderated", e aprovando mais transacoes.

**Arquivos alterados:**
- `src/components/upscaler/PreCheckoutModal.tsx`
- `supabase/functions/create-pagarme-checkout/index.ts`

