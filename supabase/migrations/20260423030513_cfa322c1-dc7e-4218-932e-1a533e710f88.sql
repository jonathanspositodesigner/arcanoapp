
-- Fix RLS policies: collaborator_id is partners.id, not auth.uid()
-- Need to check via partners table that user_id matches auth.uid()

DROP POLICY IF EXISTS "Collaborators can view own earnings" ON public.collaborator_unlock_earnings;
DROP POLICY IF EXISTS "Collaborators can view own balance" ON public.collaborator_balances;

CREATE POLICY "Collaborators can view own earnings"
ON public.collaborator_unlock_earnings
FOR SELECT
TO authenticated
USING (
  collaborator_id IN (
    SELECT id FROM public.partners WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Collaborators can view own balance"
ON public.collaborator_balances
FOR SELECT
TO authenticated
USING (
  collaborator_id IN (
    SELECT id FROM public.partners WHERE user_id = auth.uid()
  )
);
