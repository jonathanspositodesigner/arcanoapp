-- Índices para otimizar webhooks e prevenir 408/502 timeouts

-- Índice em profiles por email (case-insensitive) - acelera lookup de usuários
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON profiles (lower(email));

-- Índice composto em user_pack_purchases para acelerar verificação de acesso
CREATE INDEX IF NOT EXISTS idx_user_pack_purchases_user_pack_platform 
ON user_pack_purchases (user_id, pack_slug, platform);

-- Índice em user_pack_purchases por greenn_contract_id (já existe hotmart_transaction)
CREATE INDEX IF NOT EXISTS idx_user_pack_purchases_greenn_contract 
ON user_pack_purchases (greenn_contract_id) WHERE greenn_contract_id IS NOT NULL;

-- Índice em user_pack_purchases por hotmart_transaction para cancelamentos rápidos
CREATE INDEX IF NOT EXISTS idx_user_pack_purchases_hotmart_transaction 
ON user_pack_purchases (hotmart_transaction) WHERE hotmart_transaction IS NOT NULL;