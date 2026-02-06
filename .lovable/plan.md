

# Plano: Adicionar Totais por Ferramenta na Tabela de Rentabilidade

## O Que Você Quer

Adicionar 3 novas colunas na tabela para mostrar os **valores acumulados** de cada ferramenta:

| Ferramenta | Jobs | Receita/Job | Custo/Job | Lucro/Job | **Receita Total** | **Custo Total** | **Lucro Total** |
|------------|------|-------------|-----------|-----------|-------------------|-----------------|-----------------|
| Upscaler Arcano | 137 | R$ 0,56 | R$ 0,06 | R$ 0,49 | **R$ 76,04** | **R$ 8,65** | **R$ 67,39** |
| Pose Changer | 10 | R$ 0,56 | R$ 0,02 | R$ 0,53 | **R$ 5,55** | **R$ 0,24** | **R$ 5,31** |

---

## Alterações no Código

### Arquivo: `src/components/admin/AIToolsProfitTable.tsx`

#### 1. Adicionar cálculos de totais por linha (no `useMemo`)

```tsx
// Dentro do cálculo de tableData, adicionar:
const totalRevenue = row.revenue * row.totalJobs;
const totalCostAccum = row.totalCost * row.totalJobs;
const totalProfit = row.profit * row.totalJobs;
```

#### 2. Adicionar 3 novas colunas no header da tabela

```tsx
<TableHead>Receita Total</TableHead>
<TableHead>Custo Total</TableHead>
<TableHead>Lucro Total</TableHead>
```

#### 3. Adicionar células nas linhas da tabela

```tsx
<TableCell className="text-right font-mono text-green-600">
  {row.totalJobs > 0 ? formatBRL(row.totalRevenue) : "-"}
</TableCell>
<TableCell className="text-right font-mono text-orange-600">
  {row.totalJobs > 0 ? formatBRL(row.totalCostAccum) : "-"}
</TableCell>
<TableCell className="text-right font-mono font-bold text-green-600">
  {row.totalJobs > 0 ? formatBRL(row.totalProfitAccum) : "-"}
</TableCell>
```

---

## Estrutura Final da Tabela

```text
┌────────────────┬──────┬─────────┬─────────┬─────────┬─────────┬───────────────┬─────────────┬─────────────┬────────┐
│ Operação       │ Jobs │Créditos │Custo RH │Extra API│Receita  │ Receita Total │ Custo Total │ Lucro Total │ Margem │
│                │      │         │  (avg)  │         │(por job)│   (acumulada) │ (acumulado) │ (acumulado) │        │
├────────────────┼──────┼─────────┼─────────┼─────────┼─────────┼───────────────┼─────────────┼─────────────┼────────┤
│ Upscaler Arcano│  137 │   60    │  31.55  │    -    │ R$ 0,56 │   R$ 76,04    │   R$ 8,65   │   R$ 67,39  │ 88,2%  │
│ Pose Changer   │   10 │   60    │  11.80  │    -    │ R$ 0,56 │   R$ 5,55     │   R$ 0,24   │   R$ 5,31   │ 95,8%  │
│ Veste AI       │    3 │   60    │  18.33  │    -    │ R$ 0,56 │   R$ 1,67     │   R$ 0,11   │   R$ 1,56   │ 93,4%  │
│ Video Upscaler │    8 │  150    │  44.75  │    -    │ R$ 1,39 │   R$ 11,10    │   R$ 0,72   │   R$ 10,38  │ 93,5%  │
└────────────────┴──────┴─────────┴─────────┴─────────┴─────────┴───────────────┴─────────────┴─────────────┴────────┘
```

---

## Resumo Técnico

| Item | Detalhe |
|------|---------|
| **Arquivo modificado** | `src/components/admin/AIToolsProfitTable.tsx` |
| **Linhas afetadas** | ~200-420 (tableData calc + header + body) |
| **Novas colunas** | Receita Total, Custo Total, Lucro Total |
| **Fórmulas** | `totalJobs × valor_unitário` |
| **Edge Functions** | Nenhuma alteração |
| **Banco de dados** | Nenhuma alteração |

