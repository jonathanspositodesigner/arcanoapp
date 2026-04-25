CREATE OR REPLACE FUNCTION public.test_monthly_earning_rule_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _partner_user_id UUID := gen_random_uuid();
  _partner_id UUID := gen_random_uuid();
  _payer_user_id UUID := gen_random_uuid();
  _prompt_id UUID := gen_random_uuid();
  _job_a TEXT := 'test-job-' || gen_random_uuid()::text;
  _job_b TEXT := 'test-job-' || gen_random_uuid()::text;
  _job_c TEXT := 'test-job-' || gen_random_uuid()::text;
  _r1 jsonb; _r2 jsonb; _r3 jsonb;
  _count_total INT;
  _result jsonb;
  _is_admin BOOLEAN;
BEGIN
  -- Only admins may run this test
  SELECT public.has_role(auth.uid(), 'admin'::app_role) INTO _is_admin;
  IF NOT COALESCE(_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden_admin_only');
  END IF;

  -- Setup: create partner + prompt
  INSERT INTO public.partners (id, user_id, name, email, is_active)
  VALUES (_partner_id, _partner_user_id, 'TEST_PARTNER', 'test+' || _partner_id::text || '@test.local', true);

  INSERT INTO public.partner_prompts (id, partner_id, title, prompt, image_url, category, approved, approved_at)
  VALUES (_prompt_id, _partner_id, 'TEST_PROMPT', 'test prompt content', 'https://test.local/img.png', 'Cenários', true, now());

  -- ===== CASE A: register an earning dated to LAST month (manual insert to bypass RPC date logic) =====
  -- We insert directly because the RPC always uses now(); this simulates an existing earning from past month
  INSERT INTO public.collaborator_tool_earnings
    (collaborator_id, user_id, job_id, tool_table, prompt_id, prompt_title, amount, created_at)
  VALUES
    (_partner_id, _payer_user_id, _job_a, 'image_generator_jobs', _prompt_id::text, 'TEST_PROMPT', 0.10,
     (date_trunc('month', now()) - interval '15 days'));
  _r1 := jsonb_build_object('case', 'A_last_month_seed', 'inserted', true);

  -- ===== CASE B: call RPC for SAME (user, prompt) THIS MONTH → must SUCCEED =====
  _r2 := public.register_collaborator_tool_earning(
    _user_id := _payer_user_id,
    _job_id := _job_b,
    _tool_table := 'image_generator_jobs',
    _prompt_id := _prompt_id::text
  );

  -- ===== CASE C: call RPC AGAIN for SAME (user, prompt) SAME MONTH → must FAIL with monthly_user_prompt_limit_reached =====
  _r3 := public.register_collaborator_tool_earning(
    _user_id := _payer_user_id,
    _job_id := _job_c,
    _tool_table := 'image_generator_jobs',
    _prompt_id := _prompt_id::text
  );

  -- Count this month's earnings for that pair
  SELECT COUNT(*) INTO _count_total
  FROM public.collaborator_tool_earnings
  WHERE user_id = _payer_user_id
    AND prompt_id = _prompt_id::text
    AND date_trunc('month', created_at AT TIME ZONE 'UTC') = date_trunc('month', now() AT TIME ZONE 'UTC');

  _result := jsonb_build_object(
    'case_A_last_month_seeded', _r1,
    'case_B_this_month_first_call', _r2,
    'case_C_this_month_second_call', _r3,
    'this_month_earnings_count', _count_total,
    'pass_B_succeeded', (_r2->>'success')::boolean = true,
    'pass_C_blocked_monthly', (_r3->>'error') = 'monthly_user_prompt_limit_reached',
    'pass_only_one_this_month', _count_total = 1,
    'overall_pass', (
      (_r2->>'success')::boolean = true
      AND (_r3->>'error') = 'monthly_user_prompt_limit_reached'
      AND _count_total = 1
    )
  );

  -- CLEANUP: remove test data
  DELETE FROM public.collaborator_tool_earnings
   WHERE user_id = _payer_user_id AND prompt_id = _prompt_id::text;
  DELETE FROM public.collaborator_balances WHERE collaborator_id = _partner_id;
  DELETE FROM public.partner_prompts WHERE id = _prompt_id;
  DELETE FROM public.partners WHERE id = _partner_id;

  RETURN _result;
EXCEPTION WHEN OTHERS THEN
  -- Best-effort cleanup
  BEGIN
    DELETE FROM public.collaborator_tool_earnings
     WHERE user_id = _payer_user_id AND prompt_id = _prompt_id::text;
    DELETE FROM public.collaborator_balances WHERE collaborator_id = _partner_id;
    DELETE FROM public.partner_prompts WHERE id = _prompt_id;
    DELETE FROM public.partners WHERE id = _partner_id;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.test_monthly_earning_rule_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.test_monthly_earning_rule_v1() TO authenticated;