CREATE TABLE IF NOT EXISTS public.video_generation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'gemini',
  status TEXT NOT NULL DEFAULT 'queued',
  prompt TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL DEFAULT '16:9',
  duration INTEGER NOT NULL DEFAULT 8,
  quality TEXT NOT NULL DEFAULT '720p',
  context TEXT,
  operation_name TEXT,
  video_url TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vgq_status ON public.video_generation_queue(status);
CREATE INDEX IF NOT EXISTS idx_vgq_user ON public.video_generation_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_vgq_created ON public.video_generation_queue(created_at);

ALTER TABLE public.video_generation_queue ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own jobs
CREATE POLICY "Users can view own queue jobs"
  ON public.video_generation_queue
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queue jobs"
  ON public.video_generation_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role handles updates (processing, completion, failure)
CREATE POLICY "Service role full access"
  ON public.video_generation_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_generation_queue;