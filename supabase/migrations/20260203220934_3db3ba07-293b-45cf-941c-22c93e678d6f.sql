-- Criar tabela para jobs do Video Upscaler (isolada das outras ferramentas)
CREATE TABLE public.video_upscaler_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID,
  task_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  
  -- Input metadata
  input_file_name TEXT,
  video_width INTEGER,
  video_height INTEGER,
  video_duration_seconds NUMERIC(6,2),
  
  -- Output
  output_url TEXT,
  error_message TEXT,
  position INTEGER,
  
  -- Costs
  user_credit_cost INTEGER DEFAULT 150,
  rh_cost INTEGER DEFAULT 0,
  waited_in_queue BOOLEAN DEFAULT false,
  queue_wait_seconds INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX idx_video_upscaler_jobs_user_id ON video_upscaler_jobs(user_id);
CREATE INDEX idx_video_upscaler_jobs_session_id ON video_upscaler_jobs(session_id);
CREATE INDEX idx_video_upscaler_jobs_status ON video_upscaler_jobs(status);
CREATE INDEX idx_video_upscaler_jobs_task_id ON video_upscaler_jobs(task_id);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE video_upscaler_jobs;

-- Habilitar RLS
ALTER TABLE video_upscaler_jobs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own jobs"
  ON video_upscaler_jobs FOR SELECT
  USING ((user_id = auth.uid()) OR (user_id IS NULL));

CREATE POLICY "Users can insert their own jobs"
  ON video_upscaler_jobs FOR INSERT
  WITH CHECK ((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (user_id IS NULL)));

CREATE POLICY "Service role can update all jobs"
  ON video_upscaler_jobs FOR UPDATE
  USING (true);