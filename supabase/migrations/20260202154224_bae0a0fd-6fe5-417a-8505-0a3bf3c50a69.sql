-- Adicionar coluna dedup_key para deduplicação atômica
ALTER TABLE welcome_email_logs 
ADD COLUMN IF NOT EXISTS dedup_key TEXT;

-- Criar índice único para deduplicação atômica (previne race conditions)
CREATE UNIQUE INDEX IF NOT EXISTS idx_welcome_email_dedup_key 
ON welcome_email_logs (dedup_key) 
WHERE dedup_key IS NOT NULL;