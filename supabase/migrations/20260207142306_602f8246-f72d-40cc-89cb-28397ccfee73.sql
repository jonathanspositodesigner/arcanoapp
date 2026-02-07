-- Tabela para tokens temporários de notificação (expira em 15 min)
CREATE TABLE job_notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  table_name TEXT NOT NULL,
  job_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  consumed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_job_notification_tokens_token ON job_notification_tokens(token);
CREATE INDEX idx_job_notification_tokens_expires ON job_notification_tokens(expires_at);

-- RLS: Apenas service role pode acessar (sem policies = bloqueado para anon/authenticated)
ALTER TABLE job_notification_tokens ENABLE ROW LEVEL SECURITY;

-- Adicionar user_id à tabela push_subscriptions
ALTER TABLE push_subscriptions 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);