-- Criar função para limpar jobs expirados de todas as tabelas de AI
CREATE OR REPLACE FUNCTION cleanup_expired_ai_jobs()
RETURNS TABLE(
  upscaler_deleted INTEGER,
  pose_changer_deleted INTEGER,
  veste_ai_deleted INTEGER,
  video_upscaler_deleted INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_upscaler INTEGER;
  v_pose_changer INTEGER;
  v_veste_ai INTEGER;
  v_video_upscaler INTEGER;
BEGIN
  -- Deletar jobs de upscaler expirados (mais de 5 dias desde completed_at)
  WITH deleted AS (
    DELETE FROM upscaler_jobs
    WHERE status = 'completed'
      AND completed_at IS NOT NULL
      AND (completed_at + interval '5 days') < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_upscaler FROM deleted;

  -- Deletar jobs de pose changer expirados
  WITH deleted AS (
    DELETE FROM pose_changer_jobs
    WHERE status = 'completed'
      AND completed_at IS NOT NULL
      AND (completed_at + interval '5 days') < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_pose_changer FROM deleted;

  -- Deletar jobs de veste AI expirados
  WITH deleted AS (
    DELETE FROM veste_ai_jobs
    WHERE status = 'completed'
      AND completed_at IS NOT NULL
      AND (completed_at + interval '5 days') < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_veste_ai FROM deleted;

  -- Deletar jobs de video upscaler expirados
  WITH deleted AS (
    DELETE FROM video_upscaler_jobs
    WHERE status = 'completed'
      AND completed_at IS NOT NULL
      AND (completed_at + interval '5 days') < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_video_upscaler FROM deleted;

  RETURN QUERY SELECT v_upscaler, v_pose_changer, v_veste_ai, v_video_upscaler;
END;
$$;