-- Função para verificar se um perfil existe sem precisar de autenticação
-- Usa SECURITY DEFINER para bypassar RLS
CREATE OR REPLACE FUNCTION public.check_profile_exists(check_email TEXT)
RETURNS TABLE(exists_in_db BOOLEAN, password_changed BOOLEAN)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE as exists_in_db,
    COALESCE(p.password_changed, false) as password_changed
  FROM profiles p
  WHERE LOWER(p.email) = LOWER(check_email)
  LIMIT 1;
  
  -- Se não encontrou, retorna que não existe
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, FALSE::BOOLEAN;
  END IF;
END;
$$;