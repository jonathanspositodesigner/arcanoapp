

# Coluna de Status de Email na Aba de Vendas + Retry Automático

## O que será feito

### 1. Nova coluna "Email" na tabela de vendas
- Adicionar coluna visual na tabela de vendas (`SalesManagementContent.tsx`) mostrando se o email pós-compra foi enviado, falhou ou não foi encontrado
- Ícones: ✅ verde (enviado), ❌ vermelho (falhou), ⚠️ cinza (não encontrado)
- A informação vem da tabela `welcome_email_logs`, cruzando por email

### 2. Buscar status de email junto com as vendas
- Após carregar as vendas, fazer uma query em `welcome_email_logs` buscando os emails das vendas carregadas
- Criar um Map `email → status` para renderizar na coluna
- Campos usados: `email`, `status` ('sent'/'failed'), `error_message`

### 3. Botão de reenvio manual
- Na coluna de email, vendas com status "failed" ou sem registro terão um botão de reenvio
- O reenvio chamará uma nova Edge Function `resend-purchase-email` que reenvia o email de compra via SendPulse

### 4. Retry automático nos webhooks (Pagar.me, MercadoPago, Greenn)
- Nos webhooks existentes, após um `sendPurchaseEmail` falhar (status 'failed'), adicionar lógica de retry:
  - Aguardar 3 segundos e tentar novamente (1 retry)
  - Se falhar de novo, o registro fica como 'failed' no `welcome_email_logs` e aparece na aba de vendas para reenvio manual

### 5. Edge Function `resend-purchase-email`
- Recebe `email` e `order_id`
- Busca o pedido no `asaas_orders` para obter produto e dados
- Reconstrói o email e reenvia via SendPulse
- Atualiza o status no `welcome_email_logs`

## Arquivos modificados

- `src/components/admin/SalesManagementContent.tsx` — nova coluna + fetch de email logs + botão reenvio
- `supabase/functions/resend-purchase-email/index.ts` — nova Edge Function para reenvio manual
- `supabase/functions/webhook-pagarme/index.ts` — retry automático no `sendPurchaseEmail`
- `supabase/functions/webhook-mercadopago/index.ts` — retry automático
- `supabase/functions/webhook-greenn/index.ts` — retry automático
- `supabase/functions/webhook-greenn-creditos/index.ts` — retry automático
- `supabase/config.toml` — registrar nova function `resend-purchase-email`

## Fluxo do retry automático

```text
Webhook recebe pagamento aprovado
  → sendPurchaseEmail()
    → SendPulse API call
      → Se falhou:
        → Espera 3s
        → Tenta novamente (1x)
        → Se falhou de novo: grava status='failed' no welcome_email_logs
  → Status visível na aba de Vendas
  → Admin pode clicar "Reenviar" manualmente
```

