

# Automação de Cobrança Pix — Emails de Vencimento (6 dias)

## Contexto

As assinaturas Pix funcionam como pagamentos avulsos com ativação manual de 30 ou 365 dias. A tabela `planos2_subscriptions` tem o campo `expires_at` que define o vencimento. Atualmente não existe nenhum sistema de lembrete de renovação.

## Arquitetura

```text
pg_cron (1x/dia, 09h BRT)
  → Edge Function: process-billing-reminders
    → Para cada assinatura com vencimento entre hoje e 5 dias atrás:
      → Verificar se já enviou email desse dia
      → Verificar se o pagamento já foi feito (nova ordem paga)
      → Se não pagou e não enviou: gerar link Pagar.me + enviar email via SendPulse
      → Registrar envio na tabela de controle
```

## O que será criado

### 1. Tabela `subscription_billing_reminders` (migration)

Controle de quais emails já foram enviados e quando parar:

- `id`, `user_id`, `subscription_id`, `plan_slug`
- `due_date` (data do vencimento original)
- `day_offset` (0 = dia do vencimento, 1-5 = dias após)
- `sent_at`, `email_sent_to`
- `stopped_reason` (null, 'paid', 'unsubscribed')

### 2. Edge Function `process-billing-reminders`

Lógica principal executada 1x/dia pelo cron:

1. Busca assinaturas em `planos2_subscriptions` onde `plan_slug != 'free'`, `expires_at` entre hoje e 5 dias atrás
2. Para cada assinatura, calcula o `day_offset` (0 a 5)
3. Verifica se já enviou email para esse `day_offset` na tabela de controle
4. Verifica se o usuário renovou (nova ordem `status = 'confirmed'` com `paid_at` após o `expires_at`)
5. Se renovou → marca `stopped_reason = 'paid'` e para a sequência
6. Verifica blacklist de emails (`blacklisted_emails`)
7. Se não pagou e não enviou: cria um checkout Pagar.me (somente PIX) via API e captura o link + QR code/Pix copia-cola
8. Monta o HTML do email correspondente ao `day_offset` (0-5), substituindo todos os placeholders por dados reais:
   - Nome do usuário (da tabela `profiles`)
   - Nome do plano (mapeado do `plan_slug`)
   - Valor real (da tabela `mp_products` pelo `plan_slug`)
   - Data de vencimento formatada
   - Lista de benefícios reais do plano
   - Resumo do que será perdido (benefícios do plano que ficam indisponíveis)
   - Link de pagamento (checkout Pagar.me gerado)
   - Pix copia e cola (do checkout gerado)
9. Envia via SendPulse (usando `send-single-email` ou diretamente na função)
10. Registra na tabela de controle

### 3. Mapeamento de benefícios por plano

Baseado nos dados reais de `Planos2.tsx`:

| Plano | Créditos | Prompts/dia | Img Gen | Video Gen | Fila prioritária |
|-------|----------|-------------|---------|-----------|-----------------|
| Starter | 1.800/mês | 5 premium | ❌ | ❌ | ❌ |
| Pro | 4.200/mês | 10 premium | ✅ | ✅ | ❌ |
| Ultimate | 10.800/mês | 24 premium | ✅ | ✅ | ❌ |
| Unlimited | Ilimitados | Ilimitados | ✅ | ✅ | ✅ |

### 4. Templates dos 6 emails

Todos os 6 templates conforme especificados pelo usuário, com:
- HTML estilizado (mesma estética dos emails de compra existentes — dark theme roxo/dourado)
- Placeholders dinâmicos substituídos por dados reais
- Link de descadastro no rodapé (usando a Edge Function `email-unsubscribe` existente)
- Tom escalando de lembrete leve (dia 0-1) para urgência máxima (dia 5)

### 5. Cron job (pg_cron + pg_net)

Agendamento diário às 12:00 UTC (09:00 BRT) para chamar a Edge Function.

## Arquivos

- **Migration SQL**: criar tabela `subscription_billing_reminders`
- **`supabase/functions/process-billing-reminders/index.ts`**: Edge Function principal
- **`supabase/config.toml`**: registrar nova function com `verify_jwt = false`
- **SQL insert (pg_cron)**: agendar o cron job

## Geração do link de pagamento Pix

A Edge Function criará um checkout Pagar.me (somente PIX) para cada usuário no momento do envio do email, usando a API `POST /orders` com `accepted_payment_methods: ['pix']`. O checkout gerado terá validade de 3 dias. O link e o código Pix copia-cola serão extraídos da resposta e inseridos no email.

Para evitar criar checkouts duplicados em caso de re-execução, a tabela de controle armazena o `checkout_url` gerado.

## Detecção de pagamento

A sequência é interrompida quando:
- Uma nova ordem `asaas_orders` com `status = 'confirmed'` e `paid_at > expires_at` é encontrada para o mesmo email e um produto de assinatura do mesmo plano
- OU quando o `planos2_subscriptions.expires_at` foi atualizado para uma data futura (webhook processou renovação)

