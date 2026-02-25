CREATE POLICY "Admins can view all subscriptions"
ON planos2_subscriptions FOR SELECT
USING (has_role(auth.uid(), 'admin'));