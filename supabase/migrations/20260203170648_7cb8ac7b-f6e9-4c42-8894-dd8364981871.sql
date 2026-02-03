-- Atualizar a função check_profile_exists para normalizar email internamente
DROP FUNCTION IF EXISTS public.check_profile_exists(TEXT);

CREATE OR REPLACE FUNCTION public.check_profile_exists(check_email TEXT)
RETURNS TABLE(exists_in_db BOOLEAN, password_changed BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validação básica
  IF check_email IS NULL OR LENGTH(TRIM(check_email)) < 3 THEN
    RETURN QUERY SELECT FALSE, FALSE;
    RETURN;
  END IF;
  
  -- Normalizar email (trim + lowercase)
  check_email := LOWER(TRIM(check_email));
  
  -- Buscar perfil (RLS bypassado via SECURITY DEFINER)
  RETURN QUERY
  SELECT 
    TRUE,
    COALESCE(p.password_changed, FALSE)
  FROM profiles p
  WHERE LOWER(TRIM(p.email)) = check_email
  LIMIT 1;
  
  -- Se não encontrou, retornar false
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, FALSE;
  END IF;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.check_profile_exists(TEXT) TO anon, authenticated;