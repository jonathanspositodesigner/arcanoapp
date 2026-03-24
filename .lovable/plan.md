

## Diagnóstico

Sim, o webhook do Mercado Pago **tem** a forma de pagamento (`payment.payment_method_id` — ex: `pix`, `credit_card`) e o nome do comprador (`payment.payer.first_name` / `last_name`). O webhook já salva `payment_method` na `mp_orders` quando o pagamento é confirmado (linha 655 do webhook). Porém, para ordens **pendentes**, o `payment_method` é `null` porque o MP só envia webhook quando o pagamento é processado, não quando o checkout é criado.

Quanto ao **nome**: o `user_name` já é salvo na `mp_orders` no momento da criação do checkout (linha 106 do `create-mp-checkout`). Mas a RPC `get_unified_dashboard_orders` **não retorna** esse campo, e o frontend busca o nome apenas na tabela `profiles`.

## Plano

### 1. Alterar a RPC `get_unified_dashboard_orders` (migration SQL)
- Adicionar `user_name text` ao `RETURNS TABLE`
- Na seção `mp_orders`: retornar `o.user_name`
- Na seção `webhook_logs`: retornar `NULL::text` como `user_name`

### 2. Atualizar o frontend `SalesManagementContent.tsx`
- Adicionar `user_name` ao tipo `SaleRecord`
- Na lógica de enriquecimento de nomes (linha ~177-180): usar `user_name` como fallback: `s.name = profile?.name || s.user_name || undefined`

### 3. Sobre o `payment_method` em ordens pendentes
- Para ordens **pendentes** do MP, não há como saber o método de pagamento — o MP só informa quando processa o pagamento via webhook
- Isso é comportamento esperado (diferente da Greenn que informa no momento da compra)
- Quando o pagamento é confirmado, o webhook já atualiza corretamente o `payment_method`

### Arquivos a alterar
- Migration SQL: `get_unified_dashboard_orders` (adicionar `user_name`)
- `src/components/admin/SalesManagementContent.tsx` (usar `user_name` como fallback)
- `src/components/admin/sales-dashboard/useSalesDashboard.ts` (adicionar `user_name` ao tipo `DashboardOrder`)

