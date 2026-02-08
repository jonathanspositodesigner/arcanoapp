-- Corrigir cleanup_all_stale_ai_jobs para usar RPC de estorno corretamente
-- Isso garante que transações sejam criadas e saldos atualizados adequadamente

CREATE OR REPLACE FUNCTION public.cleanup_all_stale_ai_jobs()
RETURNS TABLE(table_name text, cancelled_count integer, refunded_credits integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job RECORD;
  refund_result RECORD;
  upscaler_cancelled INTEGER := 0;
  upscaler_refunded INTEGER := 0;
  pose_cancelled INTEGER := 0;
  pose_refunded INTEGER := 0;
  veste_cancelled INTEGER := 0;
  veste_refunded INTEGER := 0;
  video_cancelled INTEGER := 0;
  video_refunded INTEGER := 0;
  arcano_cancelled INTEGER := 0;
  arcano_refunded INTEGER := 0;
  stale_threshold INTERVAL := INTERVAL '10 minutes';
BEGIN
  -- =====================
  -- UPSCALER JOBS
  -- =====================
  FOR job IN 
    SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded 
    FROM upscaler_jobs 
    WHERE status IN ('running', 'queued', 'starting', 'pending')
    AND created_at < NOW() - stale_threshold
  LOOP
    UPDATE upscaler_jobs SET 
      status = 'failed',
      error_message = 'Job timed out - cancelled automatically after 10 minutes',
      completed_at = NOW()
    WHERE id = job.id;
    
    upscaler_cancelled := upscaler_cancelled + 1;
    
    IF job.credits_charged = TRUE 
       AND job.credits_refunded IS NOT TRUE 
       AND job.user_id IS NOT NULL 
       AND job.user_credit_cost > 0 THEN
      
      SELECT * INTO refund_result 
      FROM refund_upscaler_credits(
        job.user_id, 
        job.user_credit_cost, 
        'Estorno automático: timeout após 10 minutos'
      );
      
      IF refund_result.success THEN
        UPDATE upscaler_jobs SET credits_refunded = TRUE WHERE id = job.id;
        upscaler_refunded := upscaler_refunded + job.user_credit_cost;
      END IF;
    END IF;
  END LOOP;

  -- =====================
  -- POSE CHANGER JOBS
  -- =====================
  FOR job IN 
    SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded 
    FROM pose_changer_jobs 
    WHERE status IN ('running', 'queued', 'starting', 'pending')
    AND created_at < NOW() - stale_threshold
  LOOP
    UPDATE pose_changer_jobs SET 
      status = 'failed',
      error_message = 'Job timed out - cancelled automatically after 10 minutes',
      completed_at = NOW()
    WHERE id = job.id;
    
    pose_cancelled := pose_cancelled + 1;
    
    IF job.credits_charged = TRUE 
       AND job.credits_refunded IS NOT TRUE 
       AND job.user_id IS NOT NULL 
       AND job.user_credit_cost > 0 THEN
      
      SELECT * INTO refund_result 
      FROM refund_upscaler_credits(
        job.user_id, 
        job.user_credit_cost, 
        'Estorno automático: timeout após 10 minutos (Pose Changer)'
      );
      
      IF refund_result.success THEN
        UPDATE pose_changer_jobs SET credits_refunded = TRUE WHERE id = job.id;
        pose_refunded := pose_refunded + job.user_credit_cost;
      END IF;
    END IF;
  END LOOP;

  -- =====================
  -- VESTE AI JOBS
  -- =====================
  FOR job IN 
    SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded 
    FROM veste_ai_jobs 
    WHERE status IN ('running', 'queued', 'starting', 'pending')
    AND created_at < NOW() - stale_threshold
  LOOP
    UPDATE veste_ai_jobs SET 
      status = 'failed',
      error_message = 'Job timed out - cancelled automatically after 10 minutes',
      completed_at = NOW()
    WHERE id = job.id;
    
    veste_cancelled := veste_cancelled + 1;
    
    IF job.credits_charged = TRUE 
       AND job.credits_refunded IS NOT TRUE 
       AND job.user_id IS NOT NULL 
       AND job.user_credit_cost > 0 THEN
      
      SELECT * INTO refund_result 
      FROM refund_upscaler_credits(
        job.user_id, 
        job.user_credit_cost, 
        'Estorno automático: timeout após 10 minutos (Veste AI)'
      );
      
      IF refund_result.success THEN
        UPDATE veste_ai_jobs SET credits_refunded = TRUE WHERE id = job.id;
        veste_refunded := veste_refunded + job.user_credit_cost;
      END IF;
    END IF;
  END LOOP;

  -- =====================
  -- VIDEO UPSCALER JOBS
  -- =====================
  FOR job IN 
    SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded 
    FROM video_upscaler_jobs 
    WHERE status IN ('running', 'queued', 'starting', 'pending')
    AND created_at < NOW() - stale_threshold
  LOOP
    UPDATE video_upscaler_jobs SET 
      status = 'failed',
      error_message = 'Job timed out - cancelled automatically after 10 minutes',
      completed_at = NOW()
    WHERE id = job.id;
    
    video_cancelled := video_cancelled + 1;
    
    IF job.credits_charged = TRUE 
       AND job.credits_refunded IS NOT TRUE 
       AND job.user_id IS NOT NULL 
       AND job.user_credit_cost > 0 THEN
      
      SELECT * INTO refund_result 
      FROM refund_upscaler_credits(
        job.user_id, 
        job.user_credit_cost, 
        'Estorno automático: timeout após 10 minutos (Video Upscaler)'
      );
      
      IF refund_result.success THEN
        UPDATE video_upscaler_jobs SET credits_refunded = TRUE WHERE id = job.id;
        video_refunded := video_refunded + job.user_credit_cost;
      END IF;
    END IF;
  END LOOP;

  -- =====================
  -- ARCANO CLONER JOBS
  -- =====================
  FOR job IN 
    SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded 
    FROM arcano_cloner_jobs 
    WHERE status IN ('running', 'queued', 'starting', 'pending')
    AND created_at < NOW() - stale_threshold
  LOOP
    UPDATE arcano_cloner_jobs SET 
      status = 'failed',
      error_message = 'Job timed out - cancelled automatically after 10 minutes',
      completed_at = NOW()
    WHERE id = job.id;
    
    arcano_cancelled := arcano_cancelled + 1;
    
    IF job.credits_charged = TRUE 
       AND job.credits_refunded IS NOT TRUE 
       AND job.user_id IS NOT NULL 
       AND job.user_credit_cost > 0 THEN
      
      SELECT * INTO refund_result 
      FROM refund_upscaler_credits(
        job.user_id, 
        job.user_credit_cost, 
        'Estorno automático: timeout após 10 minutos (Arcano Cloner)'
      );
      
      IF refund_result.success THEN
        UPDATE arcano_cloner_jobs SET credits_refunded = TRUE WHERE id = job.id;
        arcano_refunded := arcano_refunded + job.user_credit_cost;
      END IF;
    END IF;
  END LOOP;

  -- Return results
  RETURN QUERY VALUES 
    ('upscaler_jobs', upscaler_cancelled, upscaler_refunded),
    ('pose_changer_jobs', pose_cancelled, pose_refunded),
    ('veste_ai_jobs', veste_cancelled, veste_refunded),
    ('video_upscaler_jobs', video_cancelled, video_refunded),
    ('arcano_cloner_jobs', arcano_cancelled, arcano_refunded);
END;
$$;