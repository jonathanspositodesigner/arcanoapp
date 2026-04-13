
CREATE OR REPLACE FUNCTION public.get_ai_tools_cost_averages()
RETURNS TABLE(tool_name TEXT, total_completed BIGINT, avg_rh_cost NUMERIC, avg_user_credits NUMERIC, total_rh_cost NUMERIC, total_user_credits NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT 'Upscaler Arcano'::TEXT, COUNT(*)::BIGINT, COALESCE(ROUND(AVG(uj.rh_cost)::NUMERIC, 2), 0), COALESCE(ROUND(AVG(uj.user_credit_cost)::NUMERIC, 2), 0), COALESCE(SUM(uj.rh_cost)::NUMERIC, 0), COALESCE(SUM(uj.user_credit_cost)::NUMERIC, 0)
  FROM upscaler_jobs uj WHERE uj.status = 'completed'
  UNION ALL
  SELECT 'Pose Changer'::TEXT, COUNT(*)::BIGINT, COALESCE(ROUND(AVG(pcj.rh_cost)::NUMERIC, 2), 0), COALESCE(ROUND(AVG(pcj.user_credit_cost)::NUMERIC, 2), 0), COALESCE(SUM(pcj.rh_cost)::NUMERIC, 0), COALESCE(SUM(pcj.user_credit_cost)::NUMERIC, 0)
  FROM pose_changer_jobs pcj WHERE pcj.status = 'completed'
  UNION ALL
  SELECT 'Veste AI'::TEXT, COUNT(*)::BIGINT, COALESCE(ROUND(AVG(vaj.rh_cost)::NUMERIC, 2), 0), COALESCE(ROUND(AVG(vaj.user_credit_cost)::NUMERIC, 2), 0), COALESCE(SUM(vaj.rh_cost)::NUMERIC, 0), COALESCE(SUM(vaj.user_credit_cost)::NUMERIC, 0)
  FROM veste_ai_jobs vaj WHERE vaj.status = 'completed'
  UNION ALL
  SELECT 'Video Upscaler'::TEXT, COUNT(*)::BIGINT, COALESCE(ROUND(AVG(vuj.rh_cost)::NUMERIC, 2), 0), COALESCE(ROUND(AVG(vuj.user_credit_cost)::NUMERIC, 2), 0), COALESCE(SUM(vuj.rh_cost)::NUMERIC, 0), COALESCE(SUM(vuj.user_credit_cost)::NUMERIC, 0)
  FROM video_upscaler_jobs vuj WHERE vuj.status = 'completed'
  UNION ALL
  SELECT 'Arcano Cloner'::TEXT, COUNT(*)::BIGINT, COALESCE(ROUND(AVG(acj.rh_cost)::NUMERIC, 2), 0), COALESCE(ROUND(AVG(acj.user_credit_cost)::NUMERIC, 2), 0), COALESCE(SUM(acj.rh_cost)::NUMERIC, 0), COALESCE(SUM(acj.user_credit_cost)::NUMERIC, 0)
  FROM arcano_cloner_jobs acj WHERE acj.status = 'completed'
  UNION ALL
  SELECT 'Gerador Avatar'::TEXT, COUNT(*)::BIGINT, COALESCE(ROUND(AVG(cgj.rh_cost)::NUMERIC, 2), 0), COALESCE(ROUND(AVG(cgj.user_credit_cost)::NUMERIC, 2), 0), COALESCE(SUM(cgj.rh_cost)::NUMERIC, 0), COALESCE(SUM(cgj.user_credit_cost)::NUMERIC, 0)
  FROM character_generator_jobs cgj WHERE cgj.status = 'completed'
  UNION ALL
  SELECT 'Gerar Imagem'::TEXT, COUNT(*)::BIGINT, 0::NUMERIC, COALESCE(ROUND(AVG(ig.user_credit_cost)::NUMERIC, 2), 0), 0::NUMERIC, COALESCE(SUM(ig.user_credit_cost)::NUMERIC, 0)
  FROM image_generator_jobs ig WHERE ig.status = 'completed'
  UNION ALL
  SELECT 'Gerar Vídeo'::TEXT, COUNT(*)::BIGINT, 0::NUMERIC, COALESCE(ROUND(AVG(vg.user_credit_cost)::NUMERIC, 2), 0), 0::NUMERIC, COALESCE(SUM(vg.user_credit_cost)::NUMERIC, 0)
  FROM video_generator_jobs vg WHERE vg.status = 'completed'
  UNION ALL
  SELECT 'Flyer Maker'::TEXT, COUNT(*)::BIGINT, COALESCE(ROUND(AVG(fmj.rh_cost)::NUMERIC, 2), 0), COALESCE(ROUND(AVG(fmj.user_credit_cost)::NUMERIC, 2), 0), COALESCE(SUM(fmj.rh_cost)::NUMERIC, 0), COALESCE(SUM(fmj.user_credit_cost)::NUMERIC, 0)
  FROM flyer_maker_jobs fmj WHERE fmj.status = 'completed'
  UNION ALL
  SELECT 'Remover Fundo'::TEXT, COUNT(*)::BIGINT, COALESCE(ROUND(AVG(brj.rh_cost)::NUMERIC, 2), 0), COALESCE(ROUND(AVG(brj.user_credit_cost)::NUMERIC, 2), 0), COALESCE(SUM(brj.rh_cost)::NUMERIC, 0), COALESCE(SUM(brj.user_credit_cost)::NUMERIC, 0)
  FROM bg_remover_jobs brj WHERE brj.status = 'completed'
  UNION ALL
  SELECT 'MovieLed Maker'::TEXT, COUNT(*)::BIGINT, COALESCE(ROUND(AVG(mlj.rh_cost)::NUMERIC, 2), 0), COALESCE(ROUND(AVG(mlj.user_credit_cost)::NUMERIC, 2), 0), COALESCE(SUM(mlj.rh_cost)::NUMERIC, 0), COALESCE(SUM(mlj.user_credit_cost)::NUMERIC, 0)
  FROM movieled_maker_jobs mlj WHERE mlj.status = 'completed'
  UNION ALL
  SELECT 'Seedance 2.0'::TEXT, COUNT(*)::BIGINT, 0::NUMERIC, COALESCE(ROUND(AVG(sj.credits_charged::INTEGER)::NUMERIC, 2), 0), 0::NUMERIC, COALESCE(SUM(sj.credits_charged::INTEGER)::NUMERIC, 0)
  FROM seedance_jobs sj WHERE sj.status = 'completed';
END;
$$;
