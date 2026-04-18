DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, user_id
    FROM public.video_generation_queue
    WHERE context = 'movie-led-maker'
      AND status IN ('queued', 'processing')
  LOOP
    UPDATE public.video_generation_queue
    SET status = 'failed',
        error_message = 'Integração Google desativada para Movie LED Maker. Job cancelado e créditos estornados — gere novamente.',
        updated_at = now()
    WHERE id = r.id;

    IF r.user_id IS NOT NULL THEN
      PERFORM public.refund_upscaler_credits(
        r.user_id,
        800,
        'Estorno - Movie LED Maker (migração para fluxo RunningHub-only)'
      );
    END IF;

    UPDATE public.movieled_maker_jobs
    SET status = 'failed',
        error_message = 'Integração Google desativada. Créditos estornados — gere novamente.',
        credits_refunded = TRUE,
        completed_at = COALESCE(completed_at, now()),
        current_step = 'failed'
    WHERE session_id = r.id
      AND status NOT IN ('completed', 'failed');
  END LOOP;
END $$;