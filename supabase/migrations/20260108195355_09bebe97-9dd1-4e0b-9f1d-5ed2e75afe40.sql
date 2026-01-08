-- Remover job anterior
SELECT cron.unschedule('process-remarketing-emails-job');

-- Reagendar para rodar a cada 10 minutos
SELECT cron.schedule(
  'process-remarketing-emails-job',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jooojbaljrshgpaxdlou.supabase.co/functions/v1/process-remarketing-emails',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impvb29qYmFsanJzaGdwYXhkbG91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYwNjY3OCwiZXhwIjoyMDgwMTgyNjc4fQ.hn5cOGGWQV8wnfN9Aa0qldkxTYGr4TL_s2ZZmKWUxR4"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);