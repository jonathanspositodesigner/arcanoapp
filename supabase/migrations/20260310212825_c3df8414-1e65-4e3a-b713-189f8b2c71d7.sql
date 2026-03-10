
-- Tabela para armazenar cartões salvos do Pagar.me
CREATE TABLE public.pagarme_saved_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pagarme_customer_id text NOT NULL,
  pagarme_card_id text NOT NULL,
  card_last_four text NOT NULL,
  card_brand text NOT NULL DEFAULT 'unknown',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, pagarme_card_id)
);

-- RLS
ALTER TABLE public.pagarme_saved_cards ENABLE ROW LEVEL SECURITY;

-- Usuário só vê seus próprios cartões
CREATE POLICY "Users can view own saved cards"
  ON public.pagarme_saved_cards
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Usuário pode deletar (desativar) seus próprios cartões
CREATE POLICY "Users can update own saved cards"
  ON public.pagarme_saved_cards
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trigger para updated_at
CREATE TRIGGER update_pagarme_saved_cards_updated_at
  BEFORE UPDATE ON public.pagarme_saved_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
