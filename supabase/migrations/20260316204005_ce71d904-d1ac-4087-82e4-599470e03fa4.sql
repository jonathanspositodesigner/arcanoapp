
-- Mark all legacy users who have credits or subscriptions as email_verified = true
-- These are users who registered before email verification was implemented
UPDATE public.profiles
SET email_verified = true
WHERE email_verified = false
AND (
  EXISTS (SELECT 1 FROM public.planos2_subscriptions s WHERE s.user_id = profiles.id)
  OR EXISTS (SELECT 1 FROM public.upscaler_credits c WHERE c.user_id = profiles.id AND c.balance > 0)
);
