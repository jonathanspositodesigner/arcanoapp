DO $$
DECLARE
  v_user uuid;
  v_already_failed boolean;
BEGIN
  SELECT user_id, (status = 'failed') INTO v_user, v_already_failed
  FROM video_generation_queue WHERE id = '725ccdb0-2b9b-444d-9c9a-bad388f7fe9b';

  IF v_user IS NULL THEN RAISE NOTICE 'Job not found'; RETURN; END IF;
  IF v_already_failed THEN RAISE NOTICE 'Already failed'; RETURN; END IF;

  UPDATE video_generation_queue
  SET status = 'failed',
      error_message = 'Limite de uso da API Google atingido (rate limit recorrente). Créditos estornados.',
      updated_at = now()
  WHERE id = '725ccdb0-2b9b-444d-9c9a-bad388f7fe9b';

  PERFORM refund_upscaler_credits(v_user, 800, 'Estorno - Movie LED Maker (rate limit Google)');

  ALTER TABLE movieled_maker_jobs DISABLE TRIGGER ALL;
  UPDATE movieled_maker_jobs
  SET status = 'failed',
      error_message = 'Limite de uso da API Google atingido. Créditos estornados.',
      credits_refunded = true,
      completed_at = now()
  WHERE session_id = '725ccdb0-2b9b-444d-9c9a-bad388f7fe9b';
  ALTER TABLE movieled_maker_jobs ENABLE TRIGGER ALL;
END $$;