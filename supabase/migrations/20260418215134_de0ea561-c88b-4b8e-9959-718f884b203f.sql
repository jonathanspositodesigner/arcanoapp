-- 1) Colunas
ALTER TABLE public.video_generation_queue
  ADD COLUMN IF NOT EXISTS rh_image_url text,
  ADD COLUMN IF NOT EXISTS rh_generated_prompt text,
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;

-- 2) Drop e recria watchdog
DROP FUNCTION IF EXISTS public.reconcile_stuck_gemini_video_jobs();

CREATE FUNCTION public.reconcile_stuck_gemini_video_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        UPDATE public.movieled_maker_jobs
        SET status='failed', error_message='Tempo limite excedido (watchdog). Créditos estornados.',
            credits_refunded=true, completed_at=now()
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
  END LOOP;
END;
$$;

-- 3) Estornar job 3f23b377 travado em loop
DO $$
DECLARE v_user uuid; v_already boolean;
BEGIN
  SELECT user_id, status='failed' INTO v_user, v_already
  FROM public.video_generation_queue WHERE id='3f23b377-8d10-488b-b6ad-0b874b041c28';
  IF v_user IS NOT NULL AND NOT COALESCE(v_already,false) THEN
    UPDATE public.video_generation_queue
    SET status='failed',
        error_message='Loop de rate limit detectado. Créditos estornados.',
        updated_at=now()
    WHERE id='3f23b377-8d10-488b-b6ad-0b874b041c28';
    PERFORM public.refund_upscaler_credits(v_user, 800, 'Estorno - Movie LED Maker (loop rate limit)');
    UPDATE public.movieled_maker_jobs
    SET status='failed', error_message='Loop de rate limit. Créditos estornados.',
        credits_refunded=true, completed_at=now()
    WHERE session_id='3f23b377-8d10-488b-b6ad-0b874b041c28' AND status NOT IN ('completed','failed');
  END IF;
END $$;