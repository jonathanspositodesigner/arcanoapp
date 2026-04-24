-- ============================================================
-- BLINDAGEM TOTAL DO SISTEMA DE EARNINGS DE COLABORADORES
-- ============================================================
-- 1) Triggers automáticos: ao concluir job com partner_prompt → registra earning
-- 2) Backfill dos jobs históricos sem earning
-- 3) Trigger de auto-update do balance ao inserir earnings
-- 4) Reescrever reconcile_collaborator_balances para somar 3 fontes
-- ============================================================

-- ============================================================
-- PARTE 1: Função genérica para registrar earning a partir de trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_register_tool_earning_from_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tool_table TEXT := TG_ARGV[0];
  v_ref_prompt_id TEXT;
  v_user_id UUID;
BEGIN
  -- Só dispara quando status muda PARA 'completed'
  IF (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND COALESCE(OLD.status,'') <> 'completed')
     OR (TG_OP = 'INSERT' AND NEW.status = 'completed') THEN
    
    v_ref_prompt_id := NEW.reference_prompt_id::text;
    v_user_id := NEW.user_id;
    
    IF v_ref_prompt_id IS NOT NULL AND v_user_id IS NOT NULL THEN
      -- Idempotente: a RPC já verifica duplicidade via UNIQUE(job_id, tool_table)
      PERFORM public.register_collaborator_tool_earning(
        _user_id := v_user_id,
        _job_id := NEW.id::text,
        _tool_table := v_tool_table,
        _prompt_id := v_ref_prompt_id
      );
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca bloquear o job por falha de earning
  RAISE WARNING 'trg_register_tool_earning_from_job (%): %', v_tool_table, SQLERRM;
  RETURN NEW;
END;
$$;

-- ============================================================
-- PARTE 2: Aplicar triggers em todas as 5 tabelas com reference_prompt_id
-- ============================================================
DROP TRIGGER IF EXISTS trg_register_earning_arcano_cloner ON public.arcano_cloner_jobs;
CREATE TRIGGER trg_register_earning_arcano_cloner
  AFTER INSERT OR UPDATE OF status ON public.arcano_cloner_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_register_tool_earning_from_job('arcano_cloner_jobs');

DROP TRIGGER IF EXISTS trg_register_earning_pose_changer ON public.pose_changer_jobs;
CREATE TRIGGER trg_register_earning_pose_changer
  AFTER INSERT OR UPDATE OF status ON public.pose_changer_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_register_tool_earning_from_job('pose_changer_jobs');

DROP TRIGGER IF EXISTS trg_register_earning_veste_ai ON public.veste_ai_jobs;
CREATE TRIGGER trg_register_earning_veste_ai
  AFTER INSERT OR UPDATE OF status ON public.veste_ai_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_register_tool_earning_from_job('veste_ai_jobs');

DROP TRIGGER IF EXISTS trg_register_earning_movieled ON public.movieled_maker_jobs;
CREATE TRIGGER trg_register_earning_movieled
  AFTER INSERT OR UPDATE OF status ON public.movieled_maker_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_register_tool_earning_from_job('movieled_maker_jobs');

DROP TRIGGER IF EXISTS trg_register_earning_seedance ON public.seedance_jobs;
CREATE TRIGGER trg_register_earning_seedance
  AFTER INSERT OR UPDATE OF status ON public.seedance_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_register_tool_earning_from_job('seedance_jobs');

-- ============================================================
-- PARTE 3: Backfill — preencher earnings que faltaram historicamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.backfill_collaborator_tool_earnings()
RETURNS TABLE(tool_table TEXT, processed INT, inserted INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_processed INT;
  v_inserted INT;
  v_result JSONB;
BEGIN
  -- arcano_cloner_jobs
  v_processed := 0; v_inserted := 0;
  FOR r IN 
    SELECT j.id, j.user_id, j.reference_prompt_id::text AS rpid
    FROM public.arcano_cloner_jobs j
    JOIN public.partner_prompts pp ON pp.id::text = j.reference_prompt_id::text AND pp.approved = true
    WHERE j.status = 'completed' AND j.user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.collaborator_tool_earnings cte WHERE cte.job_id = j.id::text AND cte.tool_table = 'arcano_cloner_jobs')
  LOOP
    v_processed := v_processed + 1;
    BEGIN
      v_result := public.register_collaborator_tool_earning(
        _user_id := r.user_id, _job_id := r.id::text,
        _tool_table := 'arcano_cloner_jobs', _prompt_id := r.rpid
      );
      IF (v_result->>'success')::boolean THEN v_inserted := v_inserted + 1; END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'backfill arcano_cloner_jobs %: %', r.id, SQLERRM;
    END;
  END LOOP;
  tool_table := 'arcano_cloner_jobs'; processed := v_processed; inserted := v_inserted; RETURN NEXT;

  -- pose_changer_jobs
  v_processed := 0; v_inserted := 0;
  FOR r IN 
    SELECT j.id, j.user_id, j.reference_prompt_id::text AS rpid
    FROM public.pose_changer_jobs j
    JOIN public.partner_prompts pp ON pp.id::text = j.reference_prompt_id::text AND pp.approved = true
    WHERE j.status = 'completed' AND j.user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.collaborator_tool_earnings cte WHERE cte.job_id = j.id::text AND cte.tool_table = 'pose_changer_jobs')
  LOOP
    v_processed := v_processed + 1;
    BEGIN
      v_result := public.register_collaborator_tool_earning(
        _user_id := r.user_id, _job_id := r.id::text,
        _tool_table := 'pose_changer_jobs', _prompt_id := r.rpid
      );
      IF (v_result->>'success')::boolean THEN v_inserted := v_inserted + 1; END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
  tool_table := 'pose_changer_jobs'; processed := v_processed; inserted := v_inserted; RETURN NEXT;

  -- veste_ai_jobs
  v_processed := 0; v_inserted := 0;
  FOR r IN 
    SELECT j.id, j.user_id, j.reference_prompt_id::text AS rpid
    FROM public.veste_ai_jobs j
    JOIN public.partner_prompts pp ON pp.id::text = j.reference_prompt_id::text AND pp.approved = true
    WHERE j.status = 'completed' AND j.user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.collaborator_tool_earnings cte WHERE cte.job_id = j.id::text AND cte.tool_table = 'veste_ai_jobs')
  LOOP
    v_processed := v_processed + 1;
    BEGIN
      v_result := public.register_collaborator_tool_earning(
        _user_id := r.user_id, _job_id := r.id::text,
        _tool_table := 'veste_ai_jobs', _prompt_id := r.rpid
      );
      IF (v_result->>'success')::boolean THEN v_inserted := v_inserted + 1; END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
  tool_table := 'veste_ai_jobs'; processed := v_processed; inserted := v_inserted; RETURN NEXT;

  -- movieled_maker_jobs
  v_processed := 0; v_inserted := 0;
  FOR r IN 
    SELECT j.id, j.user_id, j.reference_prompt_id::text AS rpid
    FROM public.movieled_maker_jobs j
    JOIN public.partner_prompts pp ON pp.id::text = j.reference_prompt_id::text AND pp.approved = true
    WHERE j.status = 'completed' AND j.user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.collaborator_tool_earnings cte WHERE cte.job_id = j.id::text AND cte.tool_table = 'movieled_maker_jobs')
  LOOP
    v_processed := v_processed + 1;
    BEGIN
      v_result := public.register_collaborator_tool_earning(
        _user_id := r.user_id, _job_id := r.id::text,
        _tool_table := 'movieled_maker_jobs', _prompt_id := r.rpid
      );
      IF (v_result->>'success')::boolean THEN v_inserted := v_inserted + 1; END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
  tool_table := 'movieled_maker_jobs'; processed := v_processed; inserted := v_inserted; RETURN NEXT;

  -- seedance_jobs
  v_processed := 0; v_inserted := 0;
  FOR r IN 
    SELECT j.id, j.user_id, j.reference_prompt_id::text AS rpid
    FROM public.seedance_jobs j
    JOIN public.partner_prompts pp ON pp.id::text = j.reference_prompt_id::text AND pp.approved = true
    WHERE j.status = 'completed' AND j.user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.collaborator_tool_earnings cte WHERE cte.job_id = j.id::text AND cte.tool_table = 'seedance_jobs')
  LOOP
    v_processed := v_processed + 1;
    BEGIN
      v_result := public.register_collaborator_tool_earning(
        _user_id := r.user_id, _job_id := r.id::text,
        _tool_table := 'seedance_jobs', _prompt_id := r.rpid
      );
      IF (v_result->>'success')::boolean THEN v_inserted := v_inserted + 1; END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
  tool_table := 'seedance_jobs'; processed := v_processed; inserted := v_inserted; RETURN NEXT;
  
  RETURN;
END;
$$;

-- ============================================================
-- PARTE 4: Reescrever reconcile_collaborator_balances para somar TUDO
-- ============================================================
CREATE OR REPLACE FUNCTION public.reconcile_collaborator_balances()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INT := 0;
BEGIN
  WITH all_earnings AS (
    SELECT collaborator_id, amount FROM public.collaborator_unlock_earnings
    UNION ALL
    SELECT collaborator_id, amount FROM public.collaborator_tool_earnings
    UNION ALL
    SELECT partner_id AS collaborator_id, amount FROM public.partner_bonus_payments
  ),
  agg AS (
    SELECT collaborator_id, COALESCE(SUM(amount),0)::numeric AS total
    FROM all_earnings GROUP BY collaborator_id
  ),
  unlock_counts AS (
    SELECT collaborator_id, COUNT(*)::int AS cnt
    FROM public.collaborator_unlock_earnings GROUP BY collaborator_id
  ),
  upserted AS (
    INSERT INTO public.collaborator_balances (collaborator_id, total_earned, total_unlocks, updated_at)
    SELECT a.collaborator_id, a.total, COALESCE(uc.cnt, 0), now()
    FROM agg a LEFT JOIN unlock_counts uc ON uc.collaborator_id = a.collaborator_id
    ON CONFLICT (collaborator_id) DO UPDATE SET
      total_earned = EXCLUDED.total_earned,
      total_unlocks = EXCLUDED.total_unlocks,
      updated_at = now()
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_updated FROM upserted;
  
  RETURN jsonb_build_object('success', true, 'updated_count', v_updated);
END;
$$;

-- ============================================================
-- PARTE 5: Trigger de auto-update do balance ao inserir earnings
-- (rede de segurança extra — mantém collaborator_balances sempre em dia)
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_sync_collaborator_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cid UUID;
BEGIN
  -- Determinar collaborator_id pela tabela origem
  IF TG_TABLE_NAME = 'partner_bonus_payments' THEN
    v_cid := NEW.partner_id;
  ELSE
    v_cid := NEW.collaborator_id;
  END IF;
  
  IF v_cid IS NULL THEN RETURN NEW; END IF;
  
  -- Recalcular total_earned e total_unlocks deste colaborador especificamente
  INSERT INTO public.collaborator_balances (collaborator_id, total_earned, total_unlocks, updated_at)
  SELECT 
    v_cid,
    COALESCE((SELECT SUM(amount) FROM public.collaborator_unlock_earnings WHERE collaborator_id = v_cid),0)
    + COALESCE((SELECT SUM(amount) FROM public.collaborator_tool_earnings WHERE collaborator_id = v_cid),0)
    + COALESCE((SELECT SUM(amount) FROM public.partner_bonus_payments WHERE partner_id = v_cid),0),
    COALESCE((SELECT COUNT(*) FROM public.collaborator_unlock_earnings WHERE collaborator_id = v_cid),0),
    now()
  ON CONFLICT (collaborator_id) DO UPDATE SET
    total_earned = EXCLUDED.total_earned,
    total_unlocks = EXCLUDED.total_unlocks,
    updated_at = now();
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_sync_collaborator_balance failed for %: %', v_cid, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_balance_on_unlock ON public.collaborator_unlock_earnings;
CREATE TRIGGER trg_sync_balance_on_unlock
  AFTER INSERT ON public.collaborator_unlock_earnings
  FOR EACH ROW EXECUTE FUNCTION public.trg_sync_collaborator_balance();

DROP TRIGGER IF EXISTS trg_sync_balance_on_tool ON public.collaborator_tool_earnings;
CREATE TRIGGER trg_sync_balance_on_tool
  AFTER INSERT ON public.collaborator_tool_earnings
  FOR EACH ROW EXECUTE FUNCTION public.trg_sync_collaborator_balance();

DROP TRIGGER IF EXISTS trg_sync_balance_on_bonus ON public.partner_bonus_payments;
CREATE TRIGGER trg_sync_balance_on_bonus
  AFTER INSERT ON public.partner_bonus_payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_sync_collaborator_balance();

-- ============================================================
-- PARTE 6: Rodar backfill + reconcile imediatamente
-- ============================================================
SELECT public.backfill_collaborator_tool_earnings();
SELECT public.reconcile_collaborator_balances();