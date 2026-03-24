

# Plano: Remover dados fictícios do checkout Pagar.me v2

## Problema

O checkout está chegando com "Cliente Arcano" e email fake `checkout+xxx@arcanoapp.com` preenchidos. O usuário quer que chegue **tudo em branco** para o cliente preencher do zero.

## Correção

No `supabase/functions/create-pagarme-checkout-v2/index.ts`:

1. **Remover o objeto `customer` inteiro** do payload enviado ao Pagar.me (linhas 159-163)
2. **Remover a variável `temporaryCustomerEmail`** (linha 150)
3. Manter `customer_editable: true` e `billing_address_editable: true` — o Pagar.me vai exibir todos os campos em branco para preenchimento

Se a API do Pagar.me exigir o campo `customer` como obrigatório (rejeitar sem ele), usar campos vazios mínimos em vez de dados inventados.

## Arquivo

| Arquivo | Alteração |
|---|---|
| `supabase/functions/create-pagarme-checkout-v2/index.ts` | Remover `customer` com dados fake do payload |

