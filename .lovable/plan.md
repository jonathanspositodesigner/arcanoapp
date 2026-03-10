

## Problema Real: Payloads Vazios + Campo Errado

### Diagnóstico

Investiguei a fundo e encontrei **dois problemas**:

1. **Campo errado no insert**: Os webhooks da Greenn enviam dados em dois formatos:
   - `type: "sale"` → método em `payload.sale.method` (funciona)
   - `type: "contract"` → método em `payload.currentSale.method` (NÃO estava sendo capturado)

2. **Payloads limpos**: Das 2.014 vendas pagas com `payment_method = NULL`, **todas** têm payload vazio `{}`. O sistema de limpeza automática apagou os dados originais, então **não tem como recuperar o método de pagamento do payload** — o dado simplesmente não existe mais.

### O que dá pra fazer

**A) Corrigir o insert nas 4 edge functions** para capturar `currentSale.method` também:
```typescript
// ANTES
payment_method: payload.sale?.method || ...

// DEPOIS  
payment_method: payload.currentSale?.method || payload.sale?.method || ...
```
Isso garante que **novas vendas** sempre terão o método de pagamento correto.

**B) Backfill parcial** — dos registros que ainda têm payload com dados (917 com `sale.method` + 143 com `currentSale.method`), atualizar:
```sql
UPDATE webhook_logs SET payment_method = payload->'sale'->>'method'
WHERE payment_method IS NULL AND payload->'sale'->>'method' IS NOT NULL;

UPDATE webhook_logs SET payment_method = payload->'currentSale'->>'method'
WHERE payment_method IS NULL AND payload->'currentSale'->>'method' IS NOT NULL;
```

**C) Para os ~2.014 registros com payload vazio** — não há como recuperar. Opções:
1. Deixar como "N/A" (dado perdido)
2. Classificar como "Desconhecido" no gráfico em vez de "N/A"
3. Esconder do gráfico os que não têm método

### Plano de Implementação

1. **Atualizar 4 edge functions** — adicionar `payload.currentSale?.method` como primeira opção no insert
2. **Executar backfill SQL** — atualizar os ~1.060 registros que ainda têm payload com dados
3. **Melhorar o componente `SalesPaymentDonut`** — renomear "N/A" para "Não identificado" e colocar por último no gráfico

**Arquivos alterados:**
- `supabase/functions/webhook-greenn/index.ts`
- `supabase/functions/webhook-greenn-artes/index.ts`
- `supabase/functions/webhook-greenn-musicos/index.ts`
- `supabase/functions/webhook-greenn-creditos/index.ts`
- `src/components/admin/sales-dashboard/SalesPaymentDonut.tsx`

