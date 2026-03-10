

## Plano: Adicionar card "Taxas de Plataformas" e ajustar Lucro/ROI

### Resumo
- Faturamento Líquido **fica como está** (valor bruto)
- Novo card "Taxas de Plataformas" mostrando total de taxas cobradas pelos gateways
- ROI e Lucro passam a descontar as taxas de plataforma do faturamento

### Cálculo das taxas (por venda aprovada)

| Plataforma | Taxa |
|---|---|
| Greenn | 4,99% + R$1,00 |
| Hotmart | 9,9% + R$1,00 |
| Mercado Pago | `amount - net_amount` (real) |

### Mudanças

**1. `useSalesDashboard.ts`**
- Calcular `platformFees` iterando `approved`:
  - MP: `amount - (net_amount ?? amount)`
  - Greenn: `amount * 0.0499 + 1.00`
  - Hotmart: `amount * 0.099 + 1.00`
- Retornar `platformFees` no hook

**2. `SalesDashboardKPIs.tsx`**
- Receber `platformFees` como prop
- Adicionar card "Taxas de Plataformas" (ícone `Receipt`, cor rosa/red) entre "Gastos com Anúncios" e "ROI"
- Grid passa de 4 para 5 colunas (`lg:grid-cols-5`)
- Lucro = `revenue - adSpend - platformFees`
- ROI = `revenue / (adSpend + platformFees)` (custo total)

**3. `SalesDashboard.tsx`**
- Extrair `platformFees` do hook e passar para `SalesDashboardKPIs`

