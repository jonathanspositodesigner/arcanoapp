
CREATE POLICY "Admins can read all referral_codes"
  ON public.referral_codes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read all referrals"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
