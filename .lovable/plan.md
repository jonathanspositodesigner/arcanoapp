

# Dashboard Analítica de Vendas — Admin Hub (aba Home)

## Resumo

Criar uma dashboard analítica completa na aba "Home" do `/admin-hub`, acima do componente `AdminGoalsCard`, alimentada por dados reais das tabelas `mp_orders` e `mp_products`, com filtro global de período.

## Mudanças no banco de dados

### 1. Adicionar coluna `payment_method` em `mp_orders`
A tabela atualmente não armazena o meio de pagamento. Precisamos adicionar essa coluna para alimentar os blocos "Vendas por Pagamento" e "Taxa de Aprovação".

```sql
ALTER TABLE mp_orders ADD COLUMN payment_method text;
ALTER TABLE mp_orders ADD COLUMN net_amount numeric;
ALTER TABLE mp_orders ADD COLUMN paid_at timestamptz;
```

### 2. Criar RPC admin para consultar métricas
Uma function `get_mp_sales_dashboard` que retorna todas as ordens com join de produto, filtradas por período, acessível apenas a admins. Isso evita problemas de RLS e permite queries eficientes.

```sql
CREATE OR REPLACE FUNCTION get_mp_dashboard_orders(_start timestamptz, _end timestamptz)
RETURNS TABLE(
  id text, status text, amount numeric, net_amount numeric,
  payment_method text, created_at timestamptz, paid_at timestamptz,
  user_email text, product_title text, product_id text,
  utm_data jsonb
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ ... $$;
```

### 3. Atualizar `webhook-mercadopago` para salvar novos campos
No momento da aprovação do pagamento, extrair do objeto `payment` da API do MP:
- `payment.payment_method_id` → salvar como `payment_method` (pix, credit_card, debit_card, etc.)
- `payment.transaction_details.net_received_amount` → salvar como `net_amount`
- `payment.date_approved` → salvar como `paid_at`

## Estrutura dos componentes

### Componente principal: `SalesDashboard.tsx`
- Filtro global de período no topo (select + date range picker personalizado)
- Busca dados via RPC ao mudar filtro
- Distribui dados para sub-componentes

### Sub-componentes:

1. **`SalesDashboardKPIs.tsx`** — Faixa de 4 cards grandes no topo:
   - Faturamento Líquido (soma `net_amount` ou `amount` dos aprovados)
   - Gastos com Anúncios (placeholder, card preparado para receber dado futuro)
   - ROI (calculado se houver gasto)
   - Lucro (faturamento - gastos)

2. **`SalesDashboardSecondaryKPIs.tsx`** — Cards menores:
   - CPA, Chargeback %, Margem %, Vendas Reembolsadas, Vendas Pendentes

3. **`SalesPaymentDonut.tsx`** — Gráfico de rosca (recharts) com distribuição por meio de pagamento

4. **`SalesConversionFunnel.tsx`** — Funil horizontal com etapas:
   - Visitas na página (page_views com path da landing)
   - Inícios de checkout (ordens criadas = pending)
   - Vendas iniciadas (pending)
   - Vendas aprovadas (paid)
   - Etapas sem dados mostram "—"

5. **`SalesByProduct.tsx`** — Lista ordenada com mini progress rings

6. **`SalesBySource.tsx`** — Lista por utm_source extraído de utm_data

7. **`SalesByHour.tsx`** — Gráfico de barras (recharts) 00-23h

8. **`SalesByWeekday.tsx`** — Gráfico de barras Dom-Sáb

9. **`SalesApprovalRate.tsx`** — Lista com taxa por meio de pagamento

### Layout em grid
```text
┌──────────────────────────────────────────────────────┐
│ [Filtro de Período: Hoje ▼]  [Data Inicial - Final]  │
├────────────┬────────────┬──────────┬─────────────────┤
│ Faturamento│ Gastos Ads │   ROI    │     Lucro       │
├────────────┼─────┬──────┼──────────┼─────────────────┤
│    CPA     │ CB% │Margem│Reembolso │   Pendentes     │
├────────────┴─────┴──────┴──────────┴─────────────────┤
│ Vendas por Pagamento    │ Funil de Conversão          │
│ (donut)                 │ (barras horizontais)        │
├─────────────────────────┼─────────────────────────────┤
│ Vendas por Produto      │ Vendas por Horário          │
│ (lista)                 │ (bar chart)                 │
├─────────────────────────┼─────────────────────────────┤
│ Vendas por Fonte        │ Vendas por Dia da Semana    │
│ (lista)                 │ (bar chart)                 │
├─────────────────────────┼─────────────────────────────┤
│ Taxa de Aprovação       │                             │
│ (lista)                 │                             │
└─────────────────────────┴─────────────────────────────┘
```

## Integração no AdminHub

No `AdminHub.tsx`, case `"home"`, inserir `<SalesDashboard />` acima de `<AdminGoalsCard />`.

## Arquivos a criar/editar

| Ação | Arquivo |
|------|---------|
| Criar | `src/components/admin/sales-dashboard/SalesDashboard.tsx` |
| Criar | `src/components/admin/sales-dashboard/SalesDashboardKPIs.tsx` |
| Criar | `src/components/admin/sales-dashboard/SalesDashboardSecondaryKPIs.tsx` |
| Criar | `src/components/admin/sales-dashboard/SalesPaymentDonut.tsx` |
| Criar | `src/components/admin/sales-dashboard/SalesConversionFunnel.tsx` |
| Criar | `src/components/admin/sales-dashboard/SalesByProduct.tsx` |
| Criar | `src/components/admin/sales-dashboard/SalesBySource.tsx` |
| Criar | `src/components/admin/sales-dashboard/SalesByHour.tsx` |
| Criar | `src/components/admin/sales-dashboard/SalesByWeekday.tsx` |
| Criar | `src/components/admin/sales-dashboard/SalesApprovalRate.tsx` |
| Criar | `src/components/admin/sales-dashboard/useSalesDashboard.ts` (hook de dados) |
| Editar | `src/pages/AdminHub.tsx` (inserir dashboard na home) |
| Editar | `supabase/functions/webhook-mercadopago/index.ts` (salvar payment_method, net_amount, paid_at) |
| Migration | Adicionar colunas + criar RPC |

## Design

- Fundo `#0a0e1a` nos cards (tom mais claro que o bg geral)
- Bordas `border-[#1e2a4a]`
- Títulos brancos, subtítulos `text-gray-400`
- Valores grandes em `text-2xl font-bold`
- ROI e Lucro em verde (`text-emerald-400`)
- Gráficos em azul (`#3b82f6`) com recharts
- Donut com cores: azul (Pix), cyan (Cartão), amarelo (Boleto), rosa (Outros)
- Ícone ⓘ no canto superior direito dos cards (tooltip futuro)

