-- 1) Drop the old overload (signature: text, text, text, uuid)
DROP FUNCTION IF EXISTS public.register_collaborator_tool_earning(text, text, text, uuid);

-- 2) Insert the missing earning for the test job
INSERT INTO public.collaborator_tool_earnings (collaborator_id, user_id, job_id, tool_table, prompt_id, prompt_title, amount)
VALUES (
  'f008a899-b57e-4a40-819c-578cf9434040',
  '61597c56-6d48-44d3-b236-5cb9cffcf995',
  'dd6af0e3-d822-47aa-9b7c-ede1244bb6f9',
  'arcano_cloner_jobs',
  '6de0b5de-a771-4556-aa14-9472ba43f640',
  'Ensaio mulher',
  0.16
) ON CONFLICT (job_id, tool_table) DO NOTHING;