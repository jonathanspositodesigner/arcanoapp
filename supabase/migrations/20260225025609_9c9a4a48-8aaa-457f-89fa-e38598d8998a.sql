
CREATE POLICY "Admins can update subscriptions"
ON planos2_subscriptions FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete subscriptions"
ON planos2_subscriptions FOR DELETE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert subscriptions"
ON planos2_subscriptions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));
