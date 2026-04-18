-- Fix stuck job for jonathan@admin.com: refund 800 credits and mark as failed
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'jonathan@admin.com' LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    -- Mark stuck job as failed
    UPDATE public.video_generation_queue
    SET status = 'failed',
        error_message = 'Timeout do runtime: polling do Google interrompido. Estornado automaticamente.',
        updated_at = now()
    WHERE id = '1e1f8f27-2023-47ed-aae9-69d9d467cef6'
      AND status = 'processing';

    -- Refund 800 credits
    PERFORM public.refund_upscaler_credits(
      v_user_id,
      800,
      'Estorno - Movie LED Maker (job travado 1e1f8f27)'
    );
  END IF;
END $$;

-- Watchdog: function to reconcile stuck "processing" jobs in video_generation_queue
-- Marks as failed and refunds credits if processing for more than 15 minutes
CREATE OR REPLACE FUNCTION public.reconcile_stuck_gemini_video_jobs()
RETURNS TABLE(job_id uuid, action text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_credit_cost int;
BEGIN
  FOR r IN
    SELECT id, user_id, context, retry_count
    FROM public.video_generation_queue
    WHERE provider = 'gemini'
      AND status = 'processing'
      AND updated_at < (now() - interval '15 minutes')
  LOOP
    v_credit_cost := 800;

    UPDATE public.video_generation_queue
    SET status = 'failed',
        error_message = COALESCE(error_message, 'Timeout: job travado em processing por mais de 15 minutos. Créditos estornados automaticamente.'),
        updated_at = now()
    WHERE id = r.id;

    IF r.user_id IS NOT NULL THEN
      BEGIN
        PERFORM public.refund_upscaler_credits(
          r.user_id,
          v_credit_cost,
          CASE WHEN r.context = 'movie-led-maker'
            THEN 'Estorno - Movie LED Maker (timeout)'
            ELSE 'Estorno - Gerar Vídeo (timeout)' END
        );
      EXCEPTION WHEN OTHERS THEN
        -- ignore refund errors, job already marked failed
        NULL;
      END;
    END IF;

    job_id := r.id;
    action := 'failed_and_refunded';
    RETURN NEXT;
  END LOOP;
  RETURN;
END;
$$;

-- Schedule the reconciliation every 5 minutes
SELECT cron.unschedule('reconcile-stuck-gemini-video-jobs') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'reconcile-stuck-gemini-video-jobs'
);

SELECT cron.schedule(
  'reconcile-stuck-gemini-video-jobs',
  '*/5 * * * *',
  $$SELECT public.reconcile_stuck_gemini_video_jobs();$$
);