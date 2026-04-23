
-- Table: partner_pix_keys
CREATE TABLE public.partner_pix_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL UNIQUE REFERENCES public.partners(id) ON DELETE CASCADE,
  pix_key text NOT NULL,
  pix_key_type text NOT NULL CHECK (pix_key_type IN ('cpf', 'email', 'telefone', 'aleatoria')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_pix_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own pix key"
ON public.partner_pix_keys FOR SELECT TO authenticated
USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can insert own pix key"
ON public.partner_pix_keys FOR INSERT TO authenticated
WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can update own pix key"
ON public.partner_pix_keys FOR UPDATE TO authenticated
USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all pix keys"
ON public.partner_pix_keys FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Table: partner_withdrawals
CREATE TABLE public.partner_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  valor_solicitado numeric(10,2) NOT NULL CHECK (valor_solicitado >= 100),
  pix_key text NOT NULL,
  pix_key_type text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'recusado')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid
);

ALTER TABLE public.partner_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own withdrawals"
ON public.partner_withdrawals FOR SELECT TO authenticated
USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can create own withdrawals"
ON public.partner_withdrawals FOR INSERT TO authenticated
WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all withdrawals"
ON public.partner_withdrawals FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all withdrawals"
ON public.partner_withdrawals FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at on partner_pix_keys
CREATE TRIGGER update_partner_pix_keys_updated_at
BEFORE UPDATE ON public.partner_pix_keys
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
