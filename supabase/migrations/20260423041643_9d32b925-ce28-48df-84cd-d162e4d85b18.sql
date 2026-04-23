
-- Allow authenticated users to update tool rates
CREATE POLICY "Authenticated users can update tool rates"
ON public.collaborator_tool_rates
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
