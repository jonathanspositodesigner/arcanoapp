-- Adicionar coluna is_paused para controle de pausa
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS is_paused boolean DEFAULT false;

-- Habilitar Realtime para atualizações em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE email_campaigns;