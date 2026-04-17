-- 1) Coluna no perfil para registrar waivers
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS warranty_waivers JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2) Função para o usuário logado registrar um waiver
CREATE OR REPLACE FUNCTION public.record_warranty_waiver(
  _tool_slug TEXT,
  _version_slug TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _entry JSONB;
BEGIN
  IF _uid IS NULL THEN
    RETURN FALSE;
  END IF;

  _entry := jsonb_build_object(
    'tool_slug', _tool_slug,
    'version_slug', COALESCE(_version_slug, ''),
    'waived_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );

  UPDATE public.profiles
  SET warranty_waivers = COALESCE(warranty_waivers, '[]'::jsonb) || _entry
  WHERE id = _uid;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_warranty_waiver(TEXT, TEXT) TO authenticated;

-- 3) Função admin para listar perfis que abriram mão da garantia
CREATE OR REPLACE FUNCTION public.get_warranty_waiver_emails()
RETURNS TABLE(
  email TEXT,
  waivers JSONB,
  last_waived_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    p.email::TEXT,
    p.warranty_waivers,
    (
      SELECT MAX((w->>'waived_at')::TIMESTAMPTZ)
      FROM jsonb_array_elements(p.warranty_waivers) AS w
    ) AS last_waived_at
  FROM public.profiles p
  WHERE jsonb_array_length(COALESCE(p.warranty_waivers, '[]'::jsonb)) > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_warranty_waiver_emails() TO authenticated;