CREATE OR REPLACE FUNCTION public.reconcile_stuck_gemini_video_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_job RECORD;
BEGIN
  -- (a) processing travado >12min
  FOR v_job IN
    SELECT id, user_id, context FROM public.video_generation_queue
    WHERE status = 'processing' AND provider = 'gemini'
      AND COALESCE(processing_started_at, updated_at) < (now() - interval '12 minutes')
  LOOP
    UPDATE public.video_generation_queue
    SET status='failed',
        error_message=COALESCE(error_message,'Tempo limite excedido (watchdog). Créditos estornados.'),
        updated_at=now()
    WHERE id = v_job.id;
    BEGIN
      PERFORM public.refund_upscaler_credits(v_job.user_id, 800, 'Estorno watchdog - '||COALESCE(v_job.context,'video'));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    IF v_job.context = 'movie-led-maker' THEN
      BEGIN
        -- DO NOT set credits_refunded here — trigger protect_ai_job_financial_columns blocks it
        UPDATE public.movieled_maker_jobs
        SET status='failed', 
            error_message='Tempo limite excedido (watchdog). Créditos estornados.',
            completed_at=now(),
            current_step='failed'
        WHERE session_id = v_job.id AND status NOT IN ('completed','failed');
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  END LOOP;

  -- (b) queued com retry>=5 há >30min
  FOR v_job IN
    SELECT id, user_id, context FROM public.video_generation_queue
    WHERE status='queued' AND provider='gemini' AND retry_count >= 5
      AND created_at < now() - interval '30 minutes'
  LOOP
    UPDATE public.video_generation_queue
    SET status='failed', error_message='Excesso de retentativas. Créditos estornados.', updated_at=now()
    WHERE id = v_job.id;
    BEGIN
      PERFORM public.refund_upscaler_credits(v_job.user_id, 800, 'Estorno watchdog retry');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    IF v_job.context = 'movie-led-maker' THEN
      BEGIN
        UPDATE public.movieled_maker_jobs
        SET status='failed', 
            error_message='Excesso de retentativas (watchdog). Créditos estornados.',
            completed_at=now(),
            current_step='failed'
        WHERE session_id = v_job.id AND status NOT IN ('completed','failed');
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  END LOOP;
END;
$function$;