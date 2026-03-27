

## Plano: Ajustar cron do process-billing-reminders para 2x/dia

### Situação atual
- Cron job `process-billing-reminders-daily` roda **1x/dia às 12:00 UTC** (`0 12 * * *`)
- Assinaturas que vencem após 12:00 UTC só são processadas no dia seguinte

### Correção
1. **Remover** o cron atual (jobid 13)
2. **Criar novo cron** com schedule `0 12,20 * * *` (roda às 12:00 e 20:00 UTC)

### SQL a executar
```sql
-- Remove o cron atual
SELECT cron.unschedule('process-billing-reminders-daily');

-- Cria novo com 2 execuções diárias
SELECT cron.schedule(
  'process-billing-reminders-daily',
  '0 12,20 * * *',
  $$
  SELECT net.http_post(
    url:='https://jooojbaljrshgpaxdlou.supabase.co/functions/v1/process-billing-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impvb29qYmFsanJzaGdwYXhkbG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MDY2NzgsImV4cCI6MjA4MDE4MjY3OH0.BtfO6nYtDomQEqkX3mQyL4S0U8IPz1xzNAz0nbfy9Q0"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

### Resultado
- Emails de cobrança serão verificados **2x/dia** (12h e 20h UTC = 9h e 17h BRT)
- Assinaturas que vencem à tarde/noite serão capturadas na execução das 20:00 UTC do mesmo dia
- Zero alteração no código da edge function

