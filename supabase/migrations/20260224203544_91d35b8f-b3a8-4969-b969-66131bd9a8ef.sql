
CREATE OR REPLACE FUNCTION public.is_premium()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM premium_users
    WHERE user_id = auth.uid()
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  )
  OR EXISTS (
    SELECT 1 FROM planos2_subscriptions
    WHERE user_id = auth.uid()
    AND is_active = true
    AND plan_slug != 'free'
    AND (expires_at IS NULL OR expires_at > now())
  )
$function$;
