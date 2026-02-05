-- =============================================
-- OBSERVABILIDADE PARA JOBS DE IA
-- Adiciona colunas para tracking de etapas e debug
-- =============================================

-- Etapa atual do job (para UI)
ALTER TABLE upscaler_jobs ADD COLUMN IF NOT EXISTS current_step text DEFAULT 'pending';
ALTER TABLE pose_changer_jobs ADD COLUMN IF NOT EXISTS current_step text DEFAULT 'pending';
ALTER TABLE veste_ai_jobs ADD COLUMN IF NOT EXISTS current_step text DEFAULT 'pending';
ALTER TABLE video_upscaler_jobs ADD COLUMN IF NOT EXISTS current_step text DEFAULT 'pending';

-- Histórico de etapas (para debug)
ALTER TABLE upscaler_jobs ADD COLUMN IF NOT EXISTS step_history jsonb DEFAULT '[]'::jsonb;
ALTER TABLE pose_changer_jobs ADD COLUMN IF NOT EXISTS step_history jsonb DEFAULT '[]'::jsonb;
ALTER TABLE veste_ai_jobs ADD COLUMN IF NOT EXISTS step_history jsonb DEFAULT '[]'::jsonb;
ALTER TABLE video_upscaler_jobs ADD COLUMN IF NOT EXISTS step_history jsonb DEFAULT '[]'::jsonb;

-- Resposta bruta da API RunningHub
ALTER TABLE upscaler_jobs ADD COLUMN IF NOT EXISTS raw_api_response jsonb;
ALTER TABLE pose_changer_jobs ADD COLUMN IF NOT EXISTS raw_api_response jsonb;
ALTER TABLE veste_ai_jobs ADD COLUMN IF NOT EXISTS raw_api_response jsonb;
ALTER TABLE video_upscaler_jobs ADD COLUMN IF NOT EXISTS raw_api_response jsonb;

-- Payload bruto do webhook
ALTER TABLE upscaler_jobs ADD COLUMN IF NOT EXISTS raw_webhook_payload jsonb;
ALTER TABLE pose_changer_jobs ADD COLUMN IF NOT EXISTS raw_webhook_payload jsonb;
ALTER TABLE veste_ai_jobs ADD COLUMN IF NOT EXISTS raw_webhook_payload jsonb;
ALTER TABLE video_upscaler_jobs ADD COLUMN IF NOT EXISTS raw_webhook_payload jsonb;

-- Etapa onde falhou (para UI)
ALTER TABLE upscaler_jobs ADD COLUMN IF NOT EXISTS failed_at_step text;
ALTER TABLE pose_changer_jobs ADD COLUMN IF NOT EXISTS failed_at_step text;
ALTER TABLE veste_ai_jobs ADD COLUMN IF NOT EXISTS failed_at_step text;
ALTER TABLE video_upscaler_jobs ADD COLUMN IF NOT EXISTS failed_at_step text;

-- Índices para consultas de debug
CREATE INDEX IF NOT EXISTS idx_upscaler_jobs_current_step ON upscaler_jobs(current_step);
CREATE INDEX IF NOT EXISTS idx_pose_changer_jobs_current_step ON pose_changer_jobs(current_step);
CREATE INDEX IF NOT EXISTS idx_veste_ai_jobs_current_step ON veste_ai_jobs(current_step);
CREATE INDEX IF NOT EXISTS idx_video_upscaler_jobs_current_step ON video_upscaler_jobs(current_step);

CREATE INDEX IF NOT EXISTS idx_upscaler_jobs_failed_at_step ON upscaler_jobs(failed_at_step) WHERE failed_at_step IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pose_changer_jobs_failed_at_step ON pose_changer_jobs(failed_at_step) WHERE failed_at_step IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_veste_ai_jobs_failed_at_step ON veste_ai_jobs(failed_at_step) WHERE failed_at_step IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_video_upscaler_jobs_failed_at_step ON video_upscaler_jobs(failed_at_step) WHERE failed_at_step IS NOT NULL;