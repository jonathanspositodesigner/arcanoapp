-- 1) Remove the faulty trigger
DROP TRIGGER IF EXISTS trg_auto_set_partner_prompt_premium ON public.partner_prompts;

-- 2) Remove the faulty function
DROP FUNCTION IF EXISTS public.auto_set_partner_prompt_premium();

-- 3) Fix already-contaminated data: Hérica's prompts that were meant to be free
UPDATE public.partner_prompts 
SET is_premium = false 
WHERE id IN (
  '6de0b5de-a771-4556-aa14-9472ba43f640',
  '301d96a0-bbd5-417e-a8af-b2b22396feeb'
);