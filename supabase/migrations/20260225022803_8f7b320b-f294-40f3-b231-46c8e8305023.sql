-- Function to expire legacy premium_users automatically
CREATE OR REPLACE FUNCTION public.expire_legacy_premium_users()
 RETURNS TABLE(users_expired integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  expired_count INTEGER := 0;
BEGIN
  UPDATE premium_users
  SET is_active = false
  WHERE is_active = true
  AND expires_at IS NOT NULL
  AND expires_at < now();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN QUERY SELECT expired_count;
END;
$function$;