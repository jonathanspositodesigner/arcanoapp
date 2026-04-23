
DROP FUNCTION IF EXISTS public.cleanup_all_stale_ai_jobs();

CREATE OR REPLACE FUNCTION public.cleanup_all_stale_ai_jobs()
 RETURNS TABLE(
   upscaler_cancelled integer, upscaler_refunded integer,
   pose_cancelled integer, pose_refunded integer,
   veste_cancelled integer, veste_refunded integer,
   video_cancelled integer, video_refunded integer,
   arcano_cancelled integer, arcano_refunded integer,
   chargen_cancelled integer, chargen_refunded integer,
   flyer_cancelled integer, flyer_refunded integer,
   bgremover_cancelled integer, bgremover_refunded integer,
   imggen_cancelled integer, imggen_refunded integer,
   videogen_cancelled integer, videogen_refunded integer,
   movieled_cancelled integer, movieled_refunded integer
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  job RECORD;
  refund_result RECORD;
  v_upscaler_cancelled INTEGER := 0; v_upscaler_refunded INTEGER := 0;
  v_pose_cancelled INTEGER := 0; v_pose_refunded INTEGER := 0;
  v_veste_cancelled INTEGER := 0; v_veste_refunded INTEGER := 0;
  v_video_cancelled INTEGER := 0; v_video_refunded INTEGER := 0;
  v_arcano_cancelled INTEGER := 0; v_arcano_refunded INTEGER := 0;
  v_chargen_cancelled INTEGER := 0; v_chargen_refunded INTEGER := 0;
  v_flyer_cancelled INTEGER := 0; v_flyer_refunded INTEGER := 0;
  v_bgremover_cancelled INTEGER := 0; v_bgremover_refunded INTEGER := 0;
  v_imggen_cancelled INTEGER := 0; v_imggen_refunded INTEGER := 0;
  v_videogen_cancelled INTEGER := 0; v_videogen_refunded INTEGER := 0;
  v_movieled_cancelled INTEGER := 0; v_movieled_refunded INTEGER := 0;
  stale_threshold INTERVAL := INTERVAL '10 minutes';
  video_stale_threshold INTERVAL := INTERVAL '15 minutes';
BEGIN
  -- UPSCALER JOBS
  FOR job IN SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded FROM upscaler_jobs WHERE status IN ('running','queued','starting','pending') AND created_at < NOW() - stale_threshold AND output_url IS NULL AND (current_step IS NULL OR current_step IS DISTINCT FROM 'webhook_received') LOOP
    UPDATE upscaler_jobs SET status='failed', error_message='Job timed out - cancelled automatically after 10 minutes', completed_at=NOW() WHERE id=job.id;
    v_upscaler_cancelled := v_upscaler_cancelled + 1;
    IF job.credits_charged = TRUE AND job.credits_refunded IS NOT TRUE AND job.user_id IS NOT NULL AND job.user_credit_cost > 0 THEN
      SELECT * INTO refund_result FROM refund_upscaler_credits(job.user_id, job.user_credit_cost, 'Estorno automático: timeout após 10 minutos (Upscaler)');
      IF refund_result.success THEN UPDATE upscaler_jobs SET credits_refunded=TRUE WHERE id=job.id; v_upscaler_refunded := v_upscaler_refunded + job.user_credit_cost; END IF;
    END IF;
  END LOOP;

  -- POSE CHANGER JOBS
  FOR job IN SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded FROM pose_changer_jobs WHERE status IN ('running','queued','starting','pending') AND created_at < NOW() - stale_threshold AND output_url IS NULL AND (current_step IS NULL OR current_step IS DISTINCT FROM 'webhook_received') LOOP
    UPDATE pose_changer_jobs SET status='failed', error_message='Job timed out - cancelled automatically after 10 minutes', completed_at=NOW() WHERE id=job.id;
    v_pose_cancelled := v_pose_cancelled + 1;
    IF job.credits_charged = TRUE AND job.credits_refunded IS NOT TRUE AND job.user_id IS NOT NULL AND job.user_credit_cost > 0 THEN
      SELECT * INTO refund_result FROM refund_upscaler_credits(job.user_id, job.user_credit_cost, 'Estorno automático: timeout após 10 minutos (Pose Changer)');
      IF refund_result.success THEN UPDATE pose_changer_jobs SET credits_refunded=TRUE WHERE id=job.id; v_pose_refunded := v_pose_refunded + job.user_credit_cost; END IF;
    END IF;
  END LOOP;

  -- VESTE AI JOBS
  FOR job IN SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded FROM veste_ai_jobs WHERE status IN ('running','queued','starting','pending') AND created_at < NOW() - stale_threshold AND output_url IS NULL AND (current_step IS NULL OR current_step IS DISTINCT FROM 'webhook_received') LOOP
    UPDATE veste_ai_jobs SET status='failed', error_message='Job timed out - cancelled automatically after 10 minutes', completed_at=NOW() WHERE id=job.id;
    v_veste_cancelled := v_veste_cancelled + 1;
    IF job.credits_charged = TRUE AND job.credits_refunded IS NOT TRUE AND job.user_id IS NOT NULL AND job.user_credit_cost > 0 THEN
      SELECT * INTO refund_result FROM refund_upscaler_credits(job.user_id, job.user_credit_cost, 'Estorno automático: timeout após 10 minutos (Veste AI)');
      IF refund_result.success THEN UPDATE veste_ai_jobs SET credits_refunded=TRUE WHERE id=job.id; v_veste_refunded := v_veste_refunded + job.user_credit_cost; END IF;
    END IF;
  END LOOP;

  -- VIDEO UPSCALER JOBS (video tool - 15 min)
  FOR job IN SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded FROM video_upscaler_jobs WHERE status IN ('running','queued','starting','pending') AND created_at < NOW() - video_stale_threshold AND output_url IS NULL AND (current_step IS NULL OR current_step IS DISTINCT FROM 'webhook_received') LOOP
    UPDATE video_upscaler_jobs SET status='failed', error_message='Job timed out - cancelled automatically after 15 minutes', completed_at=NOW() WHERE id=job.id;
    v_video_cancelled := v_video_cancelled + 1;
    IF job.credits_charged = TRUE AND job.credits_refunded IS NOT TRUE AND job.user_id IS NOT NULL AND job.user_credit_cost > 0 THEN
      SELECT * INTO refund_result FROM refund_upscaler_credits(job.user_id, job.user_credit_cost, 'Estorno automático: timeout após 15 minutos (Video Upscaler)');
      IF refund_result.success THEN UPDATE video_upscaler_jobs SET credits_refunded=TRUE WHERE id=job.id; v_video_refunded := v_video_refunded + job.user_credit_cost; END IF;
    END IF;
  END LOOP;

  -- ARCANO CLONER JOBS
  FOR job IN SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded FROM arcano_cloner_jobs WHERE status IN ('running','queued','starting','pending') AND created_at < NOW() - stale_threshold AND output_url IS NULL AND (current_step IS NULL OR current_step IS DISTINCT FROM 'webhook_received') LOOP
    UPDATE arcano_cloner_jobs SET status='failed', error_message='Job timed out - cancelled automatically after 10 minutes', completed_at=NOW() WHERE id=job.id;
    v_arcano_cancelled := v_arcano_cancelled + 1;
    IF job.credits_charged = TRUE AND job.credits_refunded IS NOT TRUE AND job.user_id IS NOT NULL AND job.user_credit_cost > 0 THEN
      SELECT * INTO refund_result FROM refund_upscaler_credits(job.user_id, job.user_credit_cost, 'Estorno automático: timeout após 10 minutos (Arcano Cloner)');
      IF refund_result.success THEN UPDATE arcano_cloner_jobs SET credits_refunded=TRUE WHERE id=job.id; v_arcano_refunded := v_arcano_refunded + job.user_credit_cost; END IF;
    END IF;
  END LOOP;

  -- CHARACTER GENERATOR JOBS
  FOR job IN SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded FROM character_generator_jobs WHERE status IN ('running','queued','starting','pending') AND created_at < NOW() - stale_threshold AND output_url IS NULL AND (current_step IS NULL OR current_step IS DISTINCT FROM 'webhook_received') LOOP
    UPDATE character_generator_jobs SET status='failed', error_message='Job timed out - cancelled automatically after 10 minutes', completed_at=NOW() WHERE id=job.id;
    v_chargen_cancelled := v_chargen_cancelled + 1;
    IF job.credits_charged = TRUE AND job.credits_refunded IS NOT TRUE AND job.user_id IS NOT NULL AND job.user_credit_cost > 0 THEN
      SELECT * INTO refund_result FROM refund_upscaler_credits(job.user_id, job.user_credit_cost, 'Estorno automático: timeout após 10 minutos (Character Generator)');
      IF refund_result.success THEN UPDATE character_generator_jobs SET credits_refunded=TRUE WHERE id=job.id; v_chargen_refunded := v_chargen_refunded + job.user_credit_cost; END IF;
    END IF;
  END LOOP;

  -- FLYER MAKER JOBS
  FOR job IN SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded FROM flyer_maker_jobs WHERE status IN ('running','queued','starting','pending') AND created_at < NOW() - stale_threshold AND output_url IS NULL AND (current_step IS NULL OR current_step IS DISTINCT FROM 'webhook_received') LOOP
    UPDATE flyer_maker_jobs SET status='failed', error_message='Job timed out - cancelled automatically after 10 minutes', completed_at=NOW() WHERE id=job.id;
    v_flyer_cancelled := v_flyer_cancelled + 1;
    IF job.credits_charged = TRUE AND job.credits_refunded IS NOT TRUE AND job.user_id IS NOT NULL AND job.user_credit_cost > 0 THEN
      SELECT * INTO refund_result FROM refund_upscaler_credits(job.user_id, job.user_credit_cost, 'Estorno automático: timeout após 10 minutos (Flyer Maker)');
      IF refund_result.success THEN UPDATE flyer_maker_jobs SET credits_refunded=TRUE WHERE id=job.id; v_flyer_refunded := v_flyer_refunded + job.user_credit_cost; END IF;
    END IF;
  END LOOP;

  -- BG REMOVER JOBS
  FOR job IN SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded FROM bg_remover_jobs WHERE status IN ('running','queued','starting','pending') AND created_at < NOW() - stale_threshold AND output_url IS NULL AND (current_step IS NULL OR current_step IS DISTINCT FROM 'webhook_received') LOOP
    UPDATE bg_remover_jobs SET status='failed', error_message='Job timed out - cancelled automatically after 10 minutes', completed_at=NOW() WHERE id=job.id;
    v_bgremover_cancelled := v_bgremover_cancelled + 1;
    IF job.credits_charged = TRUE AND job.credits_refunded IS NOT TRUE AND job.user_id IS NOT NULL AND job.user_credit_cost > 0 THEN
      SELECT * INTO refund_result FROM refund_upscaler_credits(job.user_id, job.user_credit_cost, 'Estorno automático: timeout após 10 minutos (BG Remover)');
      IF refund_result.success THEN UPDATE bg_remover_jobs SET credits_refunded=TRUE WHERE id=job.id; v_bgremover_refunded := v_bgremover_refunded + job.user_credit_cost; END IF;
    END IF;
  END LOOP;

  -- IMAGE GENERATOR JOBS
  FOR job IN SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded FROM image_generator_jobs WHERE status IN ('running','queued','starting','pending') AND created_at < NOW() - stale_threshold AND output_url IS NULL AND (current_step IS NULL OR current_step IS DISTINCT FROM 'webhook_received') LOOP
    UPDATE image_generator_jobs SET status='failed', error_message='Job timed out - cancelled automatically after 10 minutes', completed_at=NOW() WHERE id=job.id;
    v_imggen_cancelled := v_imggen_cancelled + 1;
    IF job.credits_charged = TRUE AND job.credits_refunded IS NOT TRUE AND job.user_id IS NOT NULL AND job.user_credit_cost > 0 THEN
      SELECT * INTO refund_result FROM refund_upscaler_credits(job.user_id, job.user_credit_cost, 'Estorno automático: timeout após 10 minutos (Image Generator)');
      IF refund_result.success THEN UPDATE image_generator_jobs SET credits_refunded=TRUE WHERE id=job.id; v_imggen_refunded := v_imggen_refunded + job.user_credit_cost; END IF;
    END IF;
  END LOOP;

  -- VIDEO GENERATOR JOBS (video tool - 15 min)
  FOR job IN SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded FROM video_generator_jobs WHERE status IN ('running','queued','starting','pending') AND created_at < NOW() - video_stale_threshold AND output_url IS NULL AND (current_step IS NULL OR current_step IS DISTINCT FROM 'webhook_received') LOOP
    UPDATE video_generator_jobs SET status='failed', error_message='Job timed out - cancelled automatically after 15 minutes', completed_at=NOW() WHERE id=job.id;
    v_videogen_cancelled := v_videogen_cancelled + 1;
    IF job.credits_charged = TRUE AND job.credits_refunded IS NOT TRUE AND job.user_id IS NOT NULL AND job.user_credit_cost > 0 THEN
      SELECT * INTO refund_result FROM refund_upscaler_credits(job.user_id, job.user_credit_cost, 'Estorno automático: timeout após 15 minutos (Video Generator)');
      IF refund_result.success THEN UPDATE video_generator_jobs SET credits_refunded=TRUE WHERE id=job.id; v_videogen_refunded := v_videogen_refunded + job.user_credit_cost; END IF;
    END IF;
  END LOOP;

  -- MOVIELED MAKER JOBS (video tool - 15 min)
  FOR job IN SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded FROM movieled_maker_jobs WHERE status IN ('running','queued','starting','pending') AND created_at < NOW() - video_stale_threshold AND output_url IS NULL AND (current_step IS NULL OR current_step IS DISTINCT FROM 'webhook_received') LOOP
    UPDATE movieled_maker_jobs SET status='failed', error_message='Job timed out - cancelled automatically after 15 minutes', completed_at=NOW() WHERE id=job.id;
    v_movieled_cancelled := v_movieled_cancelled + 1;
    IF job.credits_charged = TRUE AND job.credits_refunded IS NOT TRUE AND job.user_id IS NOT NULL AND job.user_credit_cost > 0 THEN
      SELECT * INTO refund_result FROM refund_upscaler_credits(job.user_id, job.user_credit_cost, 'Estorno automático: timeout após 15 minutos (MovieLed Maker)');
      IF refund_result.success THEN UPDATE movieled_maker_jobs SET credits_refunded=TRUE WHERE id=job.id; v_movieled_refunded := v_movieled_refunded + job.user_credit_cost; END IF;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_upscaler_cancelled, v_upscaler_refunded, v_pose_cancelled, v_pose_refunded, v_veste_cancelled, v_veste_refunded, v_video_cancelled, v_video_refunded, v_arcano_cancelled, v_arcano_refunded, v_chargen_cancelled, v_chargen_refunded, v_flyer_cancelled, v_flyer_refunded, v_bgremover_cancelled, v_bgremover_refunded, v_imggen_cancelled, v_imggen_refunded, v_videogen_cancelled, v_videogen_refunded, v_movieled_cancelled, v_movieled_refunded;
END;
$function$;
