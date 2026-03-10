

## Plano: Salvar todos os dados do cliente (incluindo endereço) no perfil

### Problema

O webhook do Pagar.me só salva `email` no perfil. Nome, telefone, CPF e endereço (coletados no checkout do Pagar.me) não são persistidos.

### Alterações

**1. Migração SQL — Adicionar colunas ao `profiles` e `asaas_orders`**

```sql
-- Profiles: adicionar CPF e campos de endereço
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_line TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_zip TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_state TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_country TEXT DEFAULT 'BR';

-- Orders: salvar dados coletados no pre-checkout para uso no webhook
ALTER TABLE asaas_orders ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE asaas_orders ADD COLUMN IF NOT EXISTS user_phone TEXT;
ALTER TABLE asaas_orders ADD COLUMN IF NOT EXISTS user_cpf TEXT;
```

**2. Edge Function `create-pagarme-checkout/index.ts`**

- Salvar `user_name`, `user_phone`, `user_cpf` na `asaas_orders` ao criar a ordem (insert já recebe esses valores, só falta persistir)

**3. Edge Function `webhook-pagarme/index.ts`**

No bloco de upsert do profile (linha ~338), incluir:
- `name`: de `order.user_name` → fallback `eventData.customer.name`
- `phone`: de `order.user_phone` → fallback `eventData.customer.phones.mobile_phone`
- `cpf`: de `order.user_cpf` → fallback `eventData.customer.document`
- `address_line`: de `eventData.customer.address.line_1` ou `charges[0].last_transaction.billing_address`
- `address_zip`, `address_city`, `address_state`, `address_country`: mesma fonte

Lógica: não sobrescrever campos que já têm valor no perfil (usar COALESCE no upsert ou buscar perfil antes e fazer merge).

```text
Fluxo:
  PreCheckoutModal → coleta nome, email, telefone, CPF
  create-pagarme-checkout → salva na asaas_orders + envia ao Pagar.me
  Pagar.me checkout → coleta endereço (cartão) ou usa estático (PIX)
  webhook-pagarme → lê order + payload Pagar.me → upsert completo no profiles
```

### Resumo de arquivos

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | `cpf`, `address_line/zip/city/state/country` em `profiles` + `user_name/phone/cpf` em `asaas_orders` |
| `create-pagarme-checkout/index.ts` | Salvar `user_name`, `user_phone`, `user_cpf` no insert da ordem |
| `webhook-pagarme/index.ts` | Upsert do profile com nome, phone, cpf e endereço (dados da ordem + fallback do payload Pagar.me) |

