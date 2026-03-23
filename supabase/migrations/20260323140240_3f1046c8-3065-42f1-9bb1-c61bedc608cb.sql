
-- Update check_profile_exists to include has_logged_in from auth.users.last_sign_in_at
DROP FUNCTION IF EXISTS public.check_profile_exists(TEXT);

CREATE OR REPLACE FUNCTION public.check_profile_exists(check_email TEXT)
RETURNS TABLE(exists_in_db BOOLEAN, password_changed BOOLEAN, created_at TIMESTAMPTZ, has_logged_in BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF check_email IS NULL OR LENGTH(TRIM(check_email)) < 3 THEN
    RETURN QUERY SELECT FALSE, FALSE, NULL::TIMESTAMPTZ, FALSE;
    RETURN;
  END IF;
  
  check_email := LOWER(TRIM(check_email));
  
  RETURN QUERY
  SELECT 
    TRUE,
    COALESCE(p.password_changed, FALSE),
    p.created_at,
    COALESCE((
      SELECT au.last_sign_in_at IS NOT NULL
      FROM auth.users au
      WHERE au.id = p.id
    ), FALSE)
  FROM profiles p
  WHERE LOWER(TRIM(p.email)) = check_email
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, FALSE, NULL::TIMESTAMPTZ, FALSE;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_profile_exists(TEXT) TO anon, authenticated;
