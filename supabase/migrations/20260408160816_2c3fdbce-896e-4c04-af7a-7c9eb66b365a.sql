
DROP FUNCTION IF EXISTS public.check_profile_exists(TEXT);

CREATE OR REPLACE FUNCTION public.check_profile_exists(check_email TEXT)
RETURNS TABLE(exists_in_db BOOLEAN, password_changed BOOLEAN, created_at TIMESTAMPTZ, has_logged_in BOOLEAN, exists_in_auth BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized TEXT;
  v_exists_in_db BOOLEAN := FALSE;
  v_password_changed BOOLEAN := FALSE;
  v_created_at TIMESTAMPTZ;
  v_has_logged_in BOOLEAN := FALSE;
  v_exists_in_auth BOOLEAN := FALSE;
BEGIN
  -- Normalize email
  v_normalized := lower(trim(check_email));
  
  -- Validate email format
  IF v_normalized !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
    RETURN QUERY SELECT FALSE, FALSE, NULL::TIMESTAMPTZ, FALSE, FALSE;
    RETURN;
  END IF;
  
  -- Check profiles table
  SELECT TRUE, COALESCE(p.password_changed, FALSE), p.created_at
  INTO v_exists_in_db, v_password_changed, v_created_at
  FROM profiles p
  WHERE p.email = v_normalized
  LIMIT 1;
  
  -- Check auth.users for login history and existence
  SELECT 
    TRUE,
    (u.last_sign_in_at IS NOT NULL)
  INTO v_exists_in_auth, v_has_logged_in
  FROM auth.users u
  WHERE u.email = v_normalized
  LIMIT 1;
  
  -- If not found in either, return all false
  IF NOT COALESCE(v_exists_in_db, FALSE) AND NOT COALESCE(v_exists_in_auth, FALSE) THEN
    RETURN QUERY SELECT FALSE, FALSE, NULL::TIMESTAMPTZ, FALSE, FALSE;
    RETURN;
  END IF;
  
  -- If exists in auth but not in profiles, still report exists_in_db as true
  -- so the frontend doesn't send user to signup
  IF NOT COALESCE(v_exists_in_db, FALSE) AND COALESCE(v_exists_in_auth, FALSE) THEN
    v_exists_in_db := TRUE;
    -- Use auth.users created_at as fallback
    SELECT u.created_at INTO v_created_at
    FROM auth.users u WHERE u.email = v_normalized LIMIT 1;
  END IF;

  RETURN QUERY SELECT 
    COALESCE(v_exists_in_db, FALSE),
    COALESCE(v_password_changed, FALSE),
    v_created_at,
    COALESCE(v_has_logged_in, FALSE),
    COALESCE(v_exists_in_auth, FALSE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_profile_exists(TEXT) TO anon, authenticated;
