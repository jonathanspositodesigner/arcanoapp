DO $$
DECLARE v_user uuid;
BEGIN
  SELECT user_id INTO v_user FROM public.video_generation_queue
  WHERE id='f97609ba-a092-4e8f-a176-10d010067c0b' AND status NOT IN ('failed','completed');
  IF v_user IS NOT NULL THEN
    UPDATE public.video_generation_queue
    SET status='failed',
        error_message='Limite de uso da API Google atingido (rate limit). Créditos estornados.',
        updated_at=now()
    WHERE id='f97609ba-a092-4e8f-a176-10d010067c0b';
    PERFORM public.refund_upscaler_credits(v_user, 800, 'Estorno - Movie LED Maker (Google API rate limit)');
    UPDATE public.movieled_maker_jobs
    SET status='failed',
        error_message='Limite de uso da API Google atingido. Créditos estornados.',
        completed_at=now()
    WHERE session_id='f97609ba-a092-4e8f-a176-10d010067c0b' AND status NOT IN ('completed','failed');
  END IF;
END $$;