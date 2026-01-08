-- Habilitar extensão pg_cron (se não estiver ativa)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Habilitar extensão pg_net para chamadas HTTP
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remover job anterior se existir (para evitar duplicatas)
SELECT cron.unschedule('process-remarketing-emails-job') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-remarketing-emails-job'
);

-- Agendar o job para rodar a cada 5 minutos
SELECT cron.schedule(
  'process-remarketing-emails-job',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jooojbaljrshgpaxdlou.supabase.co/functions/v1/process-remarketing-emails',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impvb29qYmFsanJzaGdwYXhkbG91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYwNjY3OCwiZXhwIjoyMDgwMTgyNjc4fQ.hn5cOGGWQV8wnfN9Aa0qldkxTYGr4TL_s2ZZmKWUxR4"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);