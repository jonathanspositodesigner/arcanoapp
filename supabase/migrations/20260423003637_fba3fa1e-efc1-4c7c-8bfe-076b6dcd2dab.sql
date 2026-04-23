
-- Add senha column to store desired password (temporarily, until account is created)
ALTER TABLE public.solicitacoes_colaboradores ADD COLUMN senha text;

-- Allow admin SELECT (already exists but let's make sure)
-- Drop existing admin select policy if exists and recreate
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin select solicitacoes_colaboradores' AND tablename = 'solicitacoes_colaboradores') THEN
    DROP POLICY "Admin select solicitacoes_colaboradores" ON public.solicitacoes_colaboradores;
  END IF;
END $$;

CREATE POLICY "Admin select solicitacoes_colaboradores"
ON public.solicitacoes_colaboradores
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow admin UPDATE (to change status)
CREATE POLICY "Admin update solicitacoes_colaboradores"
ON public.solicitacoes_colaboradores
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow admin DELETE
CREATE POLICY "Admin delete solicitacoes_colaboradores"
ON public.solicitacoes_colaboradores
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
