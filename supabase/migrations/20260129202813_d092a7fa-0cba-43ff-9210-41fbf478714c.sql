-- Tabela para gerenciar fila de processamento do upscaler
CREATE TABLE upscaler_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Índice para queries rápidas
CREATE INDEX idx_upscaler_queue_status_created 
  ON upscaler_queue(status, created_at);

-- RLS permissiva (tool pública, sem auth)
ALTER TABLE upscaler_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view queue" 
  ON upscaler_queue FOR SELECT USING (true);
  
CREATE POLICY "Anyone can insert" 
  ON upscaler_queue FOR INSERT WITH CHECK (true);
  
CREATE POLICY "Anyone can update" 
  ON upscaler_queue FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete" 
  ON upscaler_queue FOR DELETE USING (true);

-- Função de cleanup (jobs > 10 min são considerados abandonados)
CREATE OR REPLACE FUNCTION cleanup_stale_upscaler_jobs()
RETURNS void AS $$
BEGIN
  UPDATE upscaler_queue 
  SET status = 'abandoned' 
  WHERE status IN ('running', 'waiting') 
  AND created_at < NOW() - INTERVAL '10 minutes';
  
  DELETE FROM upscaler_queue 
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;