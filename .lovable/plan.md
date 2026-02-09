
## Adicionar custo extra de API e ajustar creditos do Gerador Avatar

### Mudancas

#### 1. AIToolsProfitTable.tsx - Custo extra de API (R$ 0,12) para Arcano Cloner e Gerador Avatar

Adicionar um novo mapeamento `TOOL_API_COSTS` com custo fixo de R$ 0,12 para ambas as ferramentas. Atualizar o calculo no `tableData` para que ferramentas do banco de dados tambem usem esse custo extra (atualmente hardcoded como `apiCost: 0`).

Tambem atualizar `TOOL_CREDIT_COSTS` para "Gerador Avatar": 75 (era 100).

#### 2. GeradorPersonagemTool.tsx - Baixar custo de creditos para 75

Alterar a constante `CREDIT_COST` de 100 para 75.

### Detalhes Tecnicos

**Arquivo: `src/components/admin/AIToolsProfitTable.tsx`**

- Criar constante:
```typescript
const TOOL_API_COSTS: Record<string, number> = {
  "Arcano Cloner": 0.12,
  "Gerador Avatar": 0.12,
};
```

- Alterar `TOOL_CREDIT_COSTS["Gerador Avatar"]` de 100 para 75

- No `tableData` (bloco `fromDb`), linha 204: passar o apiCost no `calculateProfit`:
```typescript
const apiCost = TOOL_API_COSTS[tool.tool_name] || 0;
const calc = calculateProfit(credits, tool.avg_rh_cost, apiCost);
```

- Linha 216: usar o apiCost real em vez de 0:
```typescript
apiCost: TOOL_API_COSTS[tool.tool_name] || 0,
```

**Arquivo: `src/pages/GeradorPersonagemTool.tsx`**

- Linha 33: alterar `const CREDIT_COST = 100;` para `const CREDIT_COST = 75;`

Isso fara com que:
- A coluna "Extra API" mostre R$ 0,12 para Arcano Cloner e Gerador Avatar
- Os calculos de Custo/Job, Lucro/Job, totais e margem sejam recalculados automaticamente incluindo esse custo extra
- O Gerador Avatar passe a cobrar 75 creditos por geracao (em vez de 100)
- A tabela de rentabilidade reflita 75 creditos para o Gerador Avatar
