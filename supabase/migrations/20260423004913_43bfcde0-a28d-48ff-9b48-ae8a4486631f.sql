
CREATE OR REPLACE FUNCTION public.check_collaborator_email(p_email text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT jsonb_build_object('exists', true, 'status', status)
     FROM solicitacoes_colaboradores
     WHERE lower(email) = lower(p_email)
     ORDER BY
       CASE status WHEN 'aprovado' THEN 0 WHEN 'pendente' THEN 1 ELSE 2 END
     LIMIT 1),
    jsonb_build_object('exists', false, 'status', null)
  );
$$;
