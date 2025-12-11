-- Migrar checkouts abandonados dos logs antigos para a nova tabela
INSERT INTO abandoned_checkouts (
  email,
  name,
  phone,
  cpf,
  product_id,
  product_name,
  offer_name,
  offer_hash,
  amount,
  checkout_link,
  checkout_step,
  remarketing_status,
  abandoned_at,
  created_at
)
SELECT DISTINCT ON (
  LOWER(TRIM(payload->'lead'->>'email')),
  (payload->'product'->>'id')::integer
)
  LOWER(TRIM(payload->'lead'->>'email')) as email,
  payload->'lead'->>'name' as name,
  REGEXP_REPLACE(COALESCE(payload->'lead'->>'cellphone', ''), '\D', '', 'g') as phone,
  payload->'lead'->>'cpf' as cpf,
  (payload->'product'->>'id')::integer as product_id,
  payload->'product'->>'name' as product_name,
  payload->'offer'->>'name' as offer_name,
  payload->'offer'->>'hash' as offer_hash,
  (COALESCE(NULLIF(payload->'offer'->>'amount', ''), NULLIF(payload->'product'->>'amount', ''), '0'))::numeric as amount,
  payload->>'link_checkout' as checkout_link,
  (NULLIF(payload->'lead'->>'step', ''))::integer as checkout_step,
  'pending' as remarketing_status,
  received_at as abandoned_at,
  NOW() as created_at
FROM webhook_logs
WHERE payload->>'event' = 'checkoutAbandoned'
  AND payload->'lead'->>'email' IS NOT NULL
  AND TRIM(payload->'lead'->>'email') != ''
ORDER BY 
  LOWER(TRIM(payload->'lead'->>'email')),
  (payload->'product'->>'id')::integer,
  received_at DESC;

-- Marcar os logs antigos como migrados
UPDATE webhook_logs 
SET result = 'migrated', mapping_type = 'lead'
WHERE payload->>'event' = 'checkoutAbandoned';