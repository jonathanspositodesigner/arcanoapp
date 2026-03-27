CREATE POLICY "Admins can read billing reminders"
ON public.subscription_billing_reminders
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));