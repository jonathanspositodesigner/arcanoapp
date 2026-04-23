
CREATE TABLE public.solicitacoes_colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  instagram TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  portfolio TEXT NOT NULL,
  aceite_termo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pendente'
);

ALTER TABLE public.solicitacoes_colaboradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit collaborator request"
  ON public.solicitacoes_colaboradores
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view collaborator requests"
  ON public.solicitacoes_colaboradores
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
