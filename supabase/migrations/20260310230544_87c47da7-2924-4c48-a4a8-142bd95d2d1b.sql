
-- Profiles: adicionar CPF e campos de endereço
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_line TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_zip TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_state TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_country TEXT DEFAULT 'BR';

-- Orders: salvar dados coletados no pre-checkout
ALTER TABLE asaas_orders ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE asaas_orders ADD COLUMN IF NOT EXISTS user_phone TEXT;
ALTER TABLE asaas_orders ADD COLUMN IF NOT EXISTS user_cpf TEXT;
