
# Automação de Cobrança Pix — Emails de Vencimento (6 dias) (CONCLUÍDA)

## Resumo
Sistema automatizado de lembretes de renovação para assinaturas Pix, com 6 emails escalonados (dia do vencimento até 5 dias após) enviados via SendPulse com links de pagamento Pagar.me gerados dinamicamente.

## O que foi feito

### 1. Tabela `subscription_billing_reminders` (migration)
- Controle de envios por `subscription_id`, `day_offset` (0-5) e `due_date`
- Campo `stopped_reason` ('paid', 'unsubscribed') para interromper a sequência
- Campo `checkout_url` para evitar checkouts duplicados
- Constraint UNIQUE em (subscription_id, day_offset, due_date)

### 2. Edge Function `process-billing-reminders`
- Executada diariamente às 12:00 UTC (09:00 BRT) via pg_cron
- Busca assinaturas Pix (sem `pagarme_subscription_id`) com `expires_at` entre hoje e 5 dias atrás
- Para cada assinatura, verifica:
  - Se já enviou email para esse `day_offset`
  - Se a sequência foi parada (pagou ou descadastrou)
  - Se o email está na blacklist
  - Se o usuário renovou (expires_at estendido ou nova ordem paga)
- Gera checkout Pagar.me somente PIX com validade de 3 dias
- Monta HTML personalizado com dados reais do plano
- Envia via SendPulse SMTP API
- Registra na tabela de controle

### 3. Mapeamento de benefícios por plano
- Starter: 1.800 créditos, 5 prompts/dia
- Pro: 4.200 créditos, 10 prompts/dia, imagem + vídeo IA
- Ultimate: 10.800 créditos, 24 prompts/dia, imagem + vídeo IA
- Unlimited: créditos ilimitados, prompts ilimitados, fila prioritária

### 4. Templates dos 6 emails
- Dia 0: Lembrete leve ("Seu plano vence hoje")
- Dia 1: Reforço pendência ("Pagamento ainda pendente")
- Dia 2: Dor da perda ("Risco de perda de acesso")
- Dia 3: Prejuízo prático ("O custo de não renovar")
- Dia 4: FOMO ("Não fique para trás")
- Dia 5: Último aviso ("Último aviso: regularize hoje")
- Todos com link de descadastro no rodapé

### 5. Cron job
- pg_cron agendado: `0 12 * * *` (09:00 BRT)
- Chama a Edge Function automaticamente

## Detecção de pagamento (para de enviar)
- `planos2_subscriptions.expires_at` estendido para data futura
- Nova ordem `asaas_orders` com `status = 'confirmed'` e `paid_at` > vencimento
- Email na `blacklisted_emails` → registra como `stopped_reason = 'unsubscribed'`
