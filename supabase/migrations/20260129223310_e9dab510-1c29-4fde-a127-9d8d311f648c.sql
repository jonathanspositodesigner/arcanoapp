-- Create upscaler_jobs table (replaces upscaler_queue)
CREATE TABLE upscaler_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  task_id TEXT,                    -- taskId do RunningHub
  status TEXT NOT NULL DEFAULT 'queued',  -- queued, running, completed, failed
  input_file_name TEXT,
  resolution INTEGER DEFAULT 4096,
  detail_denoise NUMERIC DEFAULT 0.15,
  prompt TEXT,
  output_url TEXT,                 -- URL da imagem processada
  error_message TEXT,
  position INTEGER,                -- posicao na fila (calculado)
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE upscaler_jobs;

-- RLS Policies
ALTER TABLE upscaler_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert jobs"
  ON upscaler_jobs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view jobs"
  ON upscaler_jobs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update jobs"
  ON upscaler_jobs FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete jobs"
  ON upscaler_jobs FOR DELETE
  USING (true);

-- Drop old table
DROP TABLE IF EXISTS upscaler_queue;