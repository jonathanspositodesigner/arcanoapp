

# Calcular taxas reais do Pagar.me no dashboard

## Taxas extraídas do PDF

| Método | Taxa |
|--------|------|
| Cartão à vista | 4,39% + R$0,55 (processamento) + R$0,44 (antifraude) = **4,39% + R$0,99** |
| PIX | **1,19%** + R$0,55 (processamento) = **1,19% + R$0,55** |
| Boleto | **R$3,49** + R$0,55 (processamento) = **R$4,04** |

Nota: Cartão parcelado tem taxas maiores (8,19% a 25,29%), mas como os produtos são vendidos à vista, usarei a taxa de 4,39%.

## Problema atual

- **Webhook** (linha 770): `net_amount = charge.amount / 100` — salva o valor bruto como net_amount, não desconta taxas
- **Dashboard** (linha 187): usa taxa fixa estimada `3,99% + R$0,50` para Pagar.me — incorreto

## Plano de implementação

### 1. Atualizar webhook-pagarme — calcular net_amount real
No `webhook-pagarme/index.ts`, após determinar o `paymentMethod`, calcular o `net_amount` real:
- PIX: `amount - (amount * 0.0119 + 0.55)`
- Cartão: `amount - (amount * 0.0439 + 0.99)`
- Boleto: `amount - 4.04`

### 2. Atualizar dashboard — usar net_amount real para Pagar.me
No `useSalesDashboard.ts`, mudar o cálculo de `platformFees` para Pagar.me usar `amount - net_amount` (como já faz para Mercado Pago), em vez da taxa hardcoded.

### 3. Backfill — atualizar registros antigos
Criar uma migration SQL que recalcula o `net_amount` de todas as ordens pagas do Pagar.me baseado no `payment_method` de cada uma:
```sql
UPDATE asaas_orders SET net_amount = amount - (amount * 0.0119 + 0.55) WHERE status = 'paid' AND payment_method = 'pix' AND source_platform = 'pagarme';
UPDATE asaas_orders SET net_amount = amount - (amount * 0.0439 + 0.99) WHERE status = 'paid' AND payment_method = 'credit_card' AND source_platform = 'pagarme';
UPDATE asaas_orders SET net_amount = amount - 4.04 WHERE status = 'paid' AND payment_method = 'boleto' AND source_platform = 'pagarme';
```

## Arquivos modificados
- `supabase/functions/webhook-pagarme/index.ts` — cálculo do net_amount real
- `src/components/admin/sales-dashboard/useSalesDashboard.ts` — usar net_amount real
- Migration SQL — backfill dos registros antigos

