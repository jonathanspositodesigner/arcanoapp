-- 1. Create RPC function to mark pending jobs as failed (used by frontend watchdog)
CREATE OR REPLACE FUNCTION public.mark_pending_job_as_failed(
  p_table_name text, 
  p_job_id uuid,
  p_error_message text DEFAULT 'Timeout de inicialização - Edge Function não respondeu'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_status TEXT;
  v_auth_user_id UUID;
BEGIN
  v_auth_user_id := auth.uid();
  
  -- Verificar autenticação
  IF v_auth_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Buscar job atual baseado na tabela
  IF p_table_name = 'upscaler_jobs' THEN
    SELECT user_id, status INTO v_user_id, v_current_status
    FROM upscaler_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'pose_changer_jobs' THEN
    SELECT user_id, status INTO v_user_id, v_current_status
    FROM pose_changer_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'veste_ai_jobs' THEN
    SELECT user_id, status INTO v_user_id, v_current_status
    FROM veste_ai_jobs WHERE id = p_job_id;
  ELSIF p_table_name = 'video_upscaler_jobs' THEN
    SELECT user_id, status INTO v_user_id, v_current_status
    FROM video_upscaler_jobs WHERE id = p_job_id;
  ELSE
    RETURN FALSE;
  END IF;

  -- Verificar se job existe
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Verificar dono do job
  IF v_user_id != v_auth_user_id THEN
    RETURN FALSE;
  END IF;
  
  -- Só marcar como failed se ainda está pending
  IF v_current_status != 'pending' THEN
    RETURN FALSE;
  END IF;

  -- Marcar como failed (sem reembolso pois pending nunca cobrou créditos)
  IF p_table_name = 'upscaler_jobs' THEN
    UPDATE upscaler_jobs SET 
      status = 'failed',
      error_message = p_error_message,
      completed_at = NOW()
    WHERE id = p_job_id AND status = 'pending';
  ELSIF p_table_name = 'pose_changer_jobs' THEN
    UPDATE pose_changer_jobs SET 
      status = 'failed',
      error_message = p_error_message,
      completed_at = NOW()
    WHERE id = p_job_id AND status = 'pending';
  ELSIF p_table_name = 'veste_ai_jobs' THEN
    UPDATE veste_ai_jobs SET 
      status = 'failed',
      error_message = p_error_message,
      completed_at = NOW()
    WHERE id = p_job_id AND status = 'pending';
  ELSIF p_table_name = 'video_upscaler_jobs' THEN
    UPDATE video_upscaler_jobs SET 
      status = 'failed',
      error_message = p_error_message,
      completed_at = NOW()
    WHERE id = p_job_id AND status = 'pending';
  END IF;

  RETURN TRUE;
END;
$$;

-- 2. Update cleanup_all_stale_ai_jobs to include 'pending' status
-- This is a backup mechanism (10 min) for jobs that slip through frontend watchdog
CREATE OR REPLACE FUNCTION public.cleanup_all_stale_ai_jobs()
RETURNS TABLE(table_name text, cancelled_count integer, refunded_credits integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job RECORD;
  upscaler_cancelled INTEGER := 0;
  upscaler_refunded INTEGER := 0;
  pose_cancelled INTEGER := 0;
  pose_refunded INTEGER := 0;
  veste_cancelled INTEGER := 0;
  veste_refunded INTEGER := 0;
  video_cancelled INTEGER := 0;
  video_refunded INTEGER := 0;
  stale_threshold INTERVAL := INTERVAL '10 minutes';
BEGIN
  -- Clean up stale upscaler jobs (NOW INCLUDES 'pending')
  FOR job IN 
    SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded 
    FROM upscaler_jobs 
    WHERE status IN ('running', 'queued', 'starting', 'pending')
    AND created_at < NOW() - stale_threshold
  LOOP
    -- Mark as failed
    UPDATE upscaler_jobs SET 
      status = 'failed',
      error_message = 'Job timed out - cancelled automatically after 10 minutes',
      completed_at = NOW()
    WHERE id = job.id;
    
    upscaler_cancelled := upscaler_cancelled + 1;
    
    -- Refund credits if charged and not already refunded
    IF job.credits_charged = TRUE AND job.credits_refunded IS NOT TRUE AND job.user_id IS NOT NULL AND job.user_credit_cost > 0 THEN
      UPDATE upscaler_credits 
      SET balance = balance + job.user_credit_cost,
          updated_at = NOW()
      WHERE user_id = job.user_id;
      
      UPDATE upscaler_jobs SET credits_refunded = TRUE WHERE id = job.id;
      
      upscaler_refunded := upscaler_refunded + job.user_credit_cost;
    END IF;
  END LOOP;

  -- Clean up stale pose_changer jobs (NOW INCLUDES 'pending')
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
    
    IF job.credits_charged = TRUE AND job.credits_refunded IS NOT TRUE AND job.user_id IS NOT NULL AND job.user_credit_cost > 0 THEN
      UPDATE upscaler_credits 
      SET balance = balance + job.user_credit_cost,
          updated_at = NOW()
      WHERE user_id = job.user_id;
      
      UPDATE pose_changer_jobs SET credits_refunded = TRUE WHERE id = job.id;
      
      pose_refunded := pose_refunded + job.user_credit_cost;
    END IF;
  END LOOP;

  -- Clean up stale veste_ai jobs (NOW INCLUDES 'pending')
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
    
    IF job.credits_charged = TRUE AND job.credits_refunded IS NOT TRUE AND job.user_id IS NOT NULL AND job.user_credit_cost > 0 THEN
      UPDATE upscaler_credits 
      SET balance = balance + job.user_credit_cost,
          updated_at = NOW()
      WHERE user_id = job.user_id;
      
      UPDATE veste_ai_jobs SET credits_refunded = TRUE WHERE id = job.id;
      
      veste_refunded := veste_refunded + job.user_credit_cost;
    END IF;
  END LOOP;

  -- Clean up stale video_upscaler jobs (NOW INCLUDES 'pending')
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
    
    IF job.credits_charged = TRUE AND job.credits_refunded IS NOT TRUE AND job.user_id IS NOT NULL AND job.user_credit_cost > 0 THEN
      UPDATE upscaler_credits 
      SET balance = balance + job.user_credit_cost,
          updated_at = NOW()
      WHERE user_id = job.user_id;
      
      UPDATE video_upscaler_jobs SET credits_refunded = TRUE WHERE id = job.id;
      
      video_refunded := video_refunded + job.user_credit_cost;
    END IF;
  END LOOP;

  -- Return results
  RETURN QUERY SELECT 'upscaler_jobs'::text, upscaler_cancelled, upscaler_refunded;
  RETURN QUERY SELECT 'pose_changer_jobs'::text, pose_cancelled, pose_refunded;
  RETURN QUERY SELECT 'veste_ai_jobs'::text, veste_cancelled, veste_refunded;
  RETURN QUERY SELECT 'video_upscaler_jobs'::text, video_cancelled, video_refunded;
END;
$$;

-- 3. Fix the currently stuck job
UPDATE upscaler_jobs 
SET 
  status = 'failed',
  error_message = 'Job travado como pending - corrigido manualmente',
  completed_at = NOW()
WHERE id = 'fcba40e4-bcf9-4019-bd12-69d9aa98cee4' AND status = 'pending';