-- =====================================================
-- Migração: Suporte Multi-API RunningHub (1-N Contas)
-- Adiciona coluna api_account para rastrear qual conta processou cada job
-- =====================================================

-- Adicionar coluna api_account em upscaler_jobs
ALTER TABLE public.upscaler_jobs 
ADD COLUMN IF NOT EXISTS api_account TEXT NOT NULL DEFAULT 'primary';

-- Adicionar coluna api_account em pose_changer_jobs
ALTER TABLE public.pose_changer_jobs 
ADD COLUMN IF NOT EXISTS api_account TEXT NOT NULL DEFAULT 'primary';

-- Adicionar coluna api_account em veste_ai_jobs
ALTER TABLE public.veste_ai_jobs 
ADD COLUMN IF NOT EXISTS api_account TEXT NOT NULL DEFAULT 'primary';

-- Adicionar coluna api_account em video_upscaler_jobs
ALTER TABLE public.video_upscaler_jobs 
ADD COLUMN IF NOT EXISTS api_account TEXT NOT NULL DEFAULT 'primary';

-- Criar índices para consultas de contagem por conta
CREATE INDEX IF NOT EXISTS idx_upscaler_jobs_api_account_status 
ON public.upscaler_jobs(api_account, status);

CREATE INDEX IF NOT EXISTS idx_pose_changer_jobs_api_account_status 
ON public.pose_changer_jobs(api_account, status);

CREATE INDEX IF NOT EXISTS idx_veste_ai_jobs_api_account_status 
ON public.veste_ai_jobs(api_account, status);

CREATE INDEX IF NOT EXISTS idx_video_upscaler_jobs_api_account_status 
ON public.video_upscaler_jobs(api_account, status);

-- Comentários descritivos
COMMENT ON COLUMN public.upscaler_jobs.api_account IS 'RunningHub account used: primary, account_2, account_3, account_4, account_5';
COMMENT ON COLUMN public.pose_changer_jobs.api_account IS 'RunningHub account used: primary, account_2, account_3, account_4, account_5';
COMMENT ON COLUMN public.veste_ai_jobs.api_account IS 'RunningHub account used: primary, account_2, account_3, account_4, account_5';
COMMENT ON COLUMN public.video_upscaler_jobs.api_account IS 'RunningHub account used: primary, account_2, account_3, account_4, account_5';