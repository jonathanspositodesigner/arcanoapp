
-- Tabela de produtos internos para Mercado Pago
CREATE TABLE public.mp_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  price numeric(10,2) NOT NULL,
  type text NOT NULL DEFAULT 'pack',
  pack_slug text,
  access_type text DEFAULT 'vitalicio',
  credits_amount integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Tabela de ordens de compra Mercado Pago
CREATE TABLE public.mp_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  user_id uuid,
  product_id uuid REFERENCES public.mp_products(id),
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  preference_id text,
  mp_payment_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS habilitado mas sem políticas públicas (acesso apenas via service role)
ALTER TABLE public.mp_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mp_orders ENABLE ROW LEVEL SECURITY;

-- Inserir o produto Upscaler Arcano Vitalício
INSERT INTO public.mp_products (slug, title, price, type, pack_slug, access_type, credits_amount)
VALUES ('upscaller-arcano-vitalicio', 'Upscaler Arcano - Acesso Vitalício', 39.90, 'pack', 'upscaller-arcano', 'vitalicio', 0);
