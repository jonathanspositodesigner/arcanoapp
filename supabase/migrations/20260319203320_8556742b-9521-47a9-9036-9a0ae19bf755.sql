
-- 1. Atualizar RPC check_profile_exists para retornar created_at
DROP FUNCTION IF EXISTS public.check_profile_exists(TEXT);

CREATE OR REPLACE FUNCTION public.check_profile_exists(check_email TEXT)
RETURNS TABLE(exists_in_db BOOLEAN, password_changed BOOLEAN, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF check_email IS NULL OR LENGTH(TRIM(check_email)) < 3 THEN
    RETURN QUERY SELECT FALSE, FALSE, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  check_email := LOWER(TRIM(check_email));
  
  RETURN QUERY
  SELECT 
    TRUE,
    COALESCE(p.password_changed, FALSE),
    p.created_at
  FROM profiles p
  WHERE LOWER(TRIM(p.email)) = check_email
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, FALSE, NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_profile_exists(TEXT) TO anon, authenticated;
