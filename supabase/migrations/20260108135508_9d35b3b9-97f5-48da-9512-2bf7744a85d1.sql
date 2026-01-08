-- Tabela para dispositivos confiáveis dos admins
CREATE TABLE public.admin_trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, device_fingerprint)
);

ALTER TABLE public.admin_trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own devices"
  ON public.admin_trusted_devices FOR SELECT
  USING (user_id = auth.uid() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert own devices"
  ON public.admin_trusted_devices FOR INSERT
  WITH CHECK (user_id = auth.uid() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete own devices"
  ON public.admin_trusted_devices FOR DELETE
  USING (user_id = auth.uid() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update own devices"
  ON public.admin_trusted_devices FOR UPDATE
  USING (user_id = auth.uid() AND has_role(auth.uid(), 'admin'::app_role));

-- Tabela para códigos de verificação 2FA
CREATE TABLE public.admin_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  device_fingerprint TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.admin_verification_codes ENABLE ROW LEVEL SECURITY;

-- Apenas admins autenticados podem ver seus próprios códigos (para verificar)
CREATE POLICY "Admins can view own codes"
  ON public.admin_verification_codes FOR SELECT
  USING (user_id = auth.uid() AND has_role(auth.uid(), 'admin'::app_role));

-- Índice para limpeza automática de códigos expirados
CREATE INDEX idx_admin_verification_codes_expires 
  ON public.admin_verification_codes(expires_at);

-- Índice para busca rápida por user_id e código
CREATE INDEX idx_admin_verification_codes_lookup 
  ON public.admin_verification_codes(user_id, code, expires_at);