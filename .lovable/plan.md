

## Problema

O endereço não é salvo porque:

1. **`create-pagarme-checkout`** recebe `user_address` do frontend mas **não salva na tabela `asaas_orders`** — a tabela nem tem colunas de endereço
2. **`webhook-pagarme`** faz o upsert no `profiles` apenas quando o evento é `order.paid` ou `charge.paid` (linha 284) — PIX gerado mas não pago nunca chega nesse bloco
3. No webhook, ele tenta pegar endereço de `billingAddress` do payload Pagar.me, mas para PIX não pago esse dado pode não existir

## Correção (2 partes)

### 1. Salvar endereço na `asaas_orders` ao criar o checkout

**Migration**: adicionar colunas de endereço na tabela `asaas_orders`:
- `user_address_line` (text, nullable)
- `user_address_zip` (text, nullable)
- `user_address_city` (text, nullable)
- `user_address_state` (text, nullable)
- `user_address_country` (text, default 'BR')

**`create-pagarme-checkout/index.ts`**: salvar `user_address` nas novas colunas do insert da ordem (linhas 86-96).

### 2. Salvar no perfil imediatamente ao criar a ordem (pré-checkout)

**`create-pagarme-checkout/index.ts`**: após criar a ordem, fazer upsert no `profiles` com nome, CPF, telefone e endereço — mesma lógica de "não sobrescrever dados existentes" que o webhook já usa. Buscar o `user_id` pelo email no `profiles` e, se encontrado, atualizar.

Isso garante que mesmo sem pagar o PIX, os dados ficam salvos no perfil para compras futuras com 1 clique.

### 3. Atualizar webhook para usar as colunas da ordem

**`webhook-pagarme/index.ts`**: nas linhas 353-357, adicionar fallback para as novas colunas `order.user_address_*` antes do `billingAddress` do Pagar.me, garantindo que se o endereço veio do pré-checkout local, ele é priorizado.

### Arquivos alterados
- **Migration SQL**: adicionar 5 colunas em `asaas_orders`
- **`supabase/functions/create-pagarme-checkout/index.ts`**: salvar endereço na ordem + upsert no profiles
- **`supabase/functions/webhook-pagarme/index.ts`**: usar `order.user_address_*` como fonte de dados

