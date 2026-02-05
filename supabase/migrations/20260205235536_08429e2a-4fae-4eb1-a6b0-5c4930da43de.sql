-- Tabela para controlar resgates de promoções
CREATE TABLE IF NOT EXISTS public.promo_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promo_code TEXT NOT NULL,
  credits_granted INTEGER NOT NULL,
  credit_type TEXT NOT NULL DEFAULT 'monthly',
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  
  -- Índice único para evitar resgates duplicados
  CONSTRAINT unique_user_promo UNIQUE(user_id, promo_code)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_promo_claims_user_id ON public.promo_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_claims_promo_code ON public.promo_claims(promo_code);

-- RLS: Apenas service role pode inserir, usuários podem ver seus próprios
ALTER TABLE public.promo_claims ENABLE ROW LEVEL SECURITY;

-- Política: usuários autenticados podem ver seus próprios resgates
CREATE POLICY "Users can view own claims"
ON public.promo_claims FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Comentário na tabela
COMMENT ON TABLE public.promo_claims IS 'Controla resgates de promoções de créditos para evitar duplicidade';