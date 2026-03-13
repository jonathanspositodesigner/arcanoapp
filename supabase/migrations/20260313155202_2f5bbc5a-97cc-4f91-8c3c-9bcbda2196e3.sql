-- Allow admins to read and update renewal_email_templates
CREATE POLICY "Admins can read renewal templates"
ON public.renewal_email_templates
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update renewal templates"
ON public.renewal_email_templates
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));