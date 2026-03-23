

# Plano: Remover CreditCardForm e usar checkout hospedado para assinaturas

## Problema
O CreditCardForm coleta dados do cartão no nosso modal, causando erros de validação. O usuário quer que dados do cartão sejam preenchidos na página do Pagar.me (checkout hospedado), e que no nosso modal só colete dados pessoais (nome, CPF, celular, endereço).

## Limitação técnica
O Pagar.me não oferece checkout hospedado para `/subscriptions`. A solução é usar o checkout hospedado para a **primeira cobrança** e depois criar a assinatura com o `card_id` da cobrança paga.

## Correções

### 1. Remover CreditCardForm do fluxo de assinaturas (Planos2.tsx)
Quando o usuário escolhe Cartão de Crédito para um plano de assinatura, em vez de abrir o CreditCardForm, redirecionar para o checkout hospedado do Pagar.me (mesma lógica do PIX/créditos avulsos via `create-pagarme-checkout`).

O `handlePaymentMethodSelected` para subscription + CREDIT_CARD passa a funcionar igual ao fluxo de créditos: monta o body com dados do perfil e redireciona pro checkout hospedado.

### 2. Adicionar campos de endereço ao PreCheckoutModal
Para usuários sem perfil completo (que abrem o PreCheckoutModal), adicionar campos de endereço (CEP com busca ViaCEP, Rua+Número, Cidade, Estado) ao formulário existente que já coleta nome, email, CPF e celular.

Os dados de endereço são enviados junto no payload para `create-pagarme-checkout`, que já suporta `user_address`.

### 3. Criar assinatura recorrente no webhook após primeira cobrança
No `webhook-pagarme`, quando detectar que o produto pago é do tipo `subscription` e a cobrança veio de um checkout hospedado (sem `subscription_id`):
1. Extrair o `card_id` da charge paga
2. Buscar dados do cliente (endereço, CPF, etc.) da ordem
3. Criar a assinatura via API `/subscriptions` do Pagar.me usando `card.card_id` + `billing_address`, com `start_at` na data da próxima cobrança (30 dias ou 1 ano depois)
4. Salvar o `subscription_id` na ordem

Assim a primeira cobrança é via checkout hospedado (usuário preenche cartão lá) e as seguintes são automáticas via assinatura real.

### 4. Atualizar verificação de perfil completo (Planos2.tsx)
Na função `handleSubscriptionPurchase`, incluir endereço na validação de perfil completo. Se o perfil não tiver endereço, abrir PreCheckoutModal (que agora coleta endereço).

Para o fluxo direto (perfil completo), enviar o endereço do perfil no payload do checkout.

## Fluxo final

```text
Usuário clica "Assinar" (qualquer plano)
    ↓
Tem perfil completo (nome+CPF+cel+endereço)?
    ├── NÃO → PreCheckoutModal (coleta tudo incluindo endereço)
    │         → Escolhe PIX ou Cartão → Vai pro checkout hospedado Pagar.me
    │
    └── SIM → PaymentMethodModal (PIX ou Cartão)
              → Ambos vão pro checkout hospedado Pagar.me
              → Usuário preenche cartão NA PÁGINA DO PAGAR.ME
              → Pagamento confirmado → Webhook cria subscription p/ recorrência
```

## Arquivos modificados

| Arquivo | Alteração |
|---|---|
| `src/pages/Planos2.tsx` | Remover abertura do CreditCardForm; subscription+cartão vai pro checkout hospedado; enviar endereço no payload |
| `src/components/upscaler/PreCheckoutModal.tsx` | Adicionar campos de endereço (CEP, rua, número, cidade, estado) |
| `supabase/functions/webhook-pagarme/index.ts` | Após pagamento de produto subscription via checkout, criar assinatura com card_id |
| `src/components/checkout/CreditCardForm.tsx` | Manter arquivo (pode ser usado em outros lugares), mas remover do fluxo de Planos2 |

