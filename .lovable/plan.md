

# Corrigir webhook do Mercado Pago - Erro de DNS

## Problema identificado
O webhook está recebendo as notificações do MP corretamente, mas ao consultar os detalhes do pagamento, está falhando com:
```
DNS error: failed to lookup address information: No address associated with hostname
```
URL errada: `https://api.mercadopago.com.br/v1/payments/...`
URL correta: `https://api.mercadopago.com/v1/payments/...`

## Correção
Editar `supabase/functions/webhook-mercadopago/index.ts`, linha 68:
- De: `https://api.mercadopago.com.br/v1/payments/${paymentId}`
- Para: `https://api.mercadopago.com/v1/payments/${paymentId}`

## Após a correção
O MP vai reenviar as notificações automaticamente (ele retenta por até 24h). Se não reenviar, você pode ir no painel do MP em Notificações e reenviar manualmente, ou eu posso fazer uma chamada manual para processar o pagamento `149598153214`.

