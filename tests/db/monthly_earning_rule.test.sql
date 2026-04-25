-- =============================================================================
-- TEST: Regra mensal de remuneração de colaboradores
-- =============================================================================
-- Verifica que `register_collaborator_tool_earning` (RPC) aplica corretamente:
--  1. Earning de mês passado NÃO bloqueia primeira chamada deste mês.
--  2. Segunda chamada no mesmo mês para o mesmo (user × prompt) é bloqueada
--     com erro `monthly_user_prompt_limit_reached`, mesmo trocando de ferramenta.
--  3. Apenas 1 earning é registrado no mês corrente para o par testado.
--
-- Como rodar (sandbox com PG* env vars):
--   psql -v ON_ERROR_STOP=1 -f tests/db/monthly_earning_rule.test.sql \
--        -v partner_user_id="'<auth.users.id válido>'" \
--        -v payer_user_id="'<auth.users.id válido diferente>'"
--
-- O bloco roda em transação implícita; em caso de falha (RAISE EXCEPTION) ou
-- sucesso forçamos ROLLBACK no final para não persistir dados de teste.
-- =============================================================================

BEGIN;

DO $TEST$
DECLARE
  _partner_user_id UUID := :partner_user_id;
  _payer_user_id   UUID := :payer_user_id;
  _partner_id UUID := gen_random_uuid();
  _prompt_id  UUID := gen_random_uuid();
  _job_b TEXT := 'test-job-' || gen_random_uuid()::text;
  _job_c TEXT := 'test-job-' || gen_random_uuid()::text;
  _job_d TEXT := 'test-job-' || gen_random_uuid()::text;
  _r2 jsonb; _r3 jsonb; _r4 jsonb;
  _count_this_month INT;
  _count_last_month INT;
  _ok_b BOOL; _ok_c BOOL; _ok_d BOOL;
BEGIN
  IF EXISTS(SELECT 1 FROM public.partners WHERE user_id = _partner_user_id) THEN
    RAISE EXCEPTION 'Setup error: partner_user_id already linked to a partner row';
  END IF;
  IF EXISTS(SELECT 1 FROM public.partners WHERE user_id = _payer_user_id) THEN
    RAISE EXCEPTION 'Setup error: payer_user_id is also a partner (would self-block)';
  END IF;

  -- Setup: partner + approved prompt
  INSERT INTO public.partners (id, user_id, name, email, is_active)
  VALUES (_partner_id, _partner_user_id,
          'TEST_PARTNER_' || _partner_id::text,
          'test+' || _partner_id::text || '@test.local', true);

  INSERT INTO public.partner_prompts
    (id, partner_id, title, prompt, image_url, category, approved, approved_at)
  VALUES (_prompt_id, _partner_id, 'TEST_PROMPT', 'tp',
          'https://t.local/i.png', 'Cenários', true, now());

  -- Seed: existing earning from LAST month for the same (user, prompt)
  INSERT INTO public.collaborator_tool_earnings
    (collaborator_id, user_id, job_id, tool_table, prompt_id, prompt_title, amount, created_at)
  VALUES
    (_partner_id, _payer_user_id,
     'seed-last-month-' || _partner_id::text,
     'image_generator_jobs', _prompt_id::text, 'TEST_PROMPT', 0.10,
     (date_trunc('month', now()) - interval '15 days'));

  -- CASE B: first call THIS MONTH for the same (user, prompt) → must SUCCEED
  --   (the last-month seed must NOT block a new month).
  _r2 := public.register_collaborator_tool_earning(
    _payer_user_id, _job_b, 'image_generator_jobs', _prompt_id::text);

  -- CASE C: second call THIS MONTH for the same (user, prompt) → must FAIL.
  _r3 := public.register_collaborator_tool_earning(
    _payer_user_id, _job_c, 'image_generator_jobs', _prompt_id::text);

  -- CASE D: same (user, prompt) but in a DIFFERENT AI tool, same month → must FAIL.
  --   (The monthly lock is cross-tool: it's per user × prompt × month.)
  _r4 := public.register_collaborator_tool_earning(
    _payer_user_id, _job_d, 'arcano_cloner_jobs', _prompt_id::text);

  SELECT COUNT(*) INTO _count_this_month
  FROM public.collaborator_tool_earnings
  WHERE user_id = _payer_user_id AND prompt_id = _prompt_id::text
    AND date_trunc('month', created_at AT TIME ZONE 'UTC')
      = date_trunc('month', now()        AT TIME ZONE 'UTC');

  SELECT COUNT(*) INTO _count_last_month
  FROM public.collaborator_tool_earnings
  WHERE user_id = _payer_user_id AND prompt_id = _prompt_id::text
    AND date_trunc('month', created_at AT TIME ZONE 'UTC')
      < date_trunc('month', now()        AT TIME ZONE 'UTC');

  _ok_b := (_r2->>'success')::bool = true;
  _ok_c := (_r3->>'error') = 'monthly_user_prompt_limit_reached';
  _ok_d := (_r4->>'error') = 'monthly_user_prompt_limit_reached';

  RAISE NOTICE '--- Monthly earning rule tests ---';
  RAISE NOTICE 'B (this month, 1st call):       %', _r2;
  RAISE NOTICE 'C (this month, 2nd same tool):  %', _r3;
  RAISE NOTICE 'D (this month, 2nd diff tool):  %', _r4;
  RAISE NOTICE 'this_month_count=% last_month_count=%', _count_this_month, _count_last_month;

  IF NOT (_ok_b AND _ok_c AND _ok_d
          AND _count_this_month = 1 AND _count_last_month = 1) THEN
    RAISE EXCEPTION '❌ TEST FAILED: B=% C=% D=% this=% last=%',
      _ok_b, _ok_c, _ok_d, _count_this_month, _count_last_month;
  END IF;

  RAISE NOTICE '✅ ALL MONTHLY EARNING RULE TESTS PASSED';
END
$TEST$;

-- Rollback to leave database untouched
ROLLBACK;