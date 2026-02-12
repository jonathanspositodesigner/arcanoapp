
-- Create image_generator_jobs table
CREATE TABLE public.image_generator_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'normal',
  aspect_ratio TEXT NOT NULL DEFAULT '1:1',
  reference_images JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  output_url TEXT,
  error_message TEXT,
  user_credit_cost INTEGER DEFAULT 0,
  credits_charged BOOLEAN DEFAULT false,
  credits_refunded BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create video_generator_jobs table
CREATE TABLE public.video_generator_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL DEFAULT '16:9',
  duration_seconds INTEGER NOT NULL DEFAULT 5,
  start_frame_url TEXT,
  end_frame_url TEXT,
  operation_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  output_url TEXT,
  error_message TEXT,
  user_credit_cost INTEGER DEFAULT 0,
  credits_charged BOOLEAN DEFAULT false,
  credits_refunded BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.image_generator_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_generator_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for image_generator_jobs
CREATE POLICY "Users can view own image jobs"
  ON public.image_generator_jobs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own image jobs"
  ON public.image_generator_jobs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role full access image jobs"
  ON public.image_generator_jobs FOR ALL
  USING (auth.role() = 'service_role');

-- RLS policies for video_generator_jobs
CREATE POLICY "Users can view own video jobs"
  ON public.video_generator_jobs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own video jobs"
  ON public.video_generator_jobs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role full access video jobs"
  ON public.video_generator_jobs FOR ALL
  USING (auth.role() = 'service_role');

-- Insert ai_tool_settings entries
INSERT INTO public.ai_tool_settings (tool_name, credit_cost, has_api_cost, api_cost)
VALUES 
  ('gerar_imagem', 40, false, 0),
  ('gerar_imagem_pro', 60, false, 0),
  ('gerar_video', 150, false, 0);
