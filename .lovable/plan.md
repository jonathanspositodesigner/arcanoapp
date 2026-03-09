

# Corrigir: Mostrar apenas vendas aprovadas nos componentes do dashboard

## Problema
`SalesByProduct` e `SalesBySource` recebem `orders` (que inclui pending, refunded, etc.) e usam isso para contar o "total". Isso infla os números com vendas não aprovadas. O funil de conversão usa `approved.length + pending.length` como "Vendas Inic.", o que também conta pendentes.

## Componentes afetados e correções

1. **SalesByProduct** — Trocar para usar apenas `approved` em vez de `orders` para a contagem principal. Remover a prop `orders`.

2. **SalesBySource** — Mesmo problema, mesma correção. Usar apenas `approved`.

3. **SalesConversionFunnel** — `totalOrders` atualmente é `approved.length + pending.length`. Mudar para usar apenas `orders.length` como "Vendas Iniciadas" (total de tentativas) e manter `approved.length` como "Vendas Aprovadas". Isso faz sentido no funil: todas as tentativas → aprovadas.

4. **SalesDashboard.tsx** — Atualizar as props passadas para esses componentes, removendo `orders` de `SalesByProduct` e `SalesBySource`.

## Resumo das mudanças
- `SalesByProduct`: mostrar apenas aprovadas (quantidade = `approved`)
- `SalesBySource`: mostrar apenas aprovadas (quantidade = `approved`)  
- `SalesConversionFunnel`: manter como está (já mostra vendas iniciadas vs aprovadas, faz sentido no funil)
- `SalesByHour` e `SalesByWeekday`: já usam apenas `approved` — OK
- 4 arquivos editados

