

## Problema Identificado

O bug está na linha 90-91 do `useSalesDashboard.ts`. Ao consultar a tabela `meta_ad_spend` (que usa coluna `date` do tipo **date**, não timestamp), o código extrai a data assim:

```typescript
const startDate = start.toISOString().split("T")[0]; // UTC!
const endDate = end.toISOString().split("T")[0];     // UTC!
```

O problema: `endOfDay()` cria `23:59:59` no horário local (São Paulo, UTC-3), que ao converter para UTC vira o **dia seguinte** (ex: 9 de março 23:59 SP = 10 de março 02:59 UTC).

**Exemplo concreto para "Ontem" (9 de março):**
- `end` = 9/mar 23:59:59 São Paulo = 10/mar 02:59:59 UTC
- `endDate` = `"2026-03-10"` (dia errado!)
- A query puxa gastos do dia 9 **E** do dia 10 = R$751,90 ao invés de R$605,26

## Solução

Extrair as datas locais **antes** da conversão UTC, usando `toLocaleDateString` ou formatação manual para a query de `meta_ad_spend`:

**Arquivo: `src/components/admin/sales-dashboard/useSalesDashboard.ts`**

Substituir linhas 90-91:
```typescript
// ANTES (bugado - converte para UTC antes de extrair a data)
const startDate = start.toISOString().split("T")[0];
const endDate = end.toISOString().split("T")[0];

// DEPOIS (correto - usa a data local de São Paulo)
const pad = (n: number) => String(n).padStart(2, "0");
const startDate = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
const endDate = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
```

Isso garante que, para "Ontem" (9 de março), a query busque `date >= '2026-03-09' AND date <= '2026-03-09'`, pegando exatamente o gasto daquele dia.

A mudança afeta **apenas** a query de `meta_ad_spend`. As queries de orders (RPC) e page_views já usam timestamps com timezone e funcionam corretamente.

