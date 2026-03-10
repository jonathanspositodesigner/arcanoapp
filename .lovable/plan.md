

## Problema: N/A em "Vendas por Pagamento"

**Causa raiz encontrada.** O payload da Greenn envia o método de pagamento em `sale.method` (ex: "PIX", "CREDIT_CARD"), mas **todas** as edge functions estão buscando em `sale.payment_method` (que não existe):

```
// Código atual (ERRADO):
payment_method: payload.sale?.payment_method || payload.payment?.method || null

// Payload real da Greenn:
{ sale: { method: "PIX", amount: 29.9, ... } }
```

Resultado: **2.011 de 2.014 vendas de webhook** têm `payment_method = NULL`, aparecendo como "N/A" no gráfico.

---

## Plano

### 1. Corrigir extração do payment_method em 4 edge functions

Alterar a linha de insert em cada webhook para buscar `payload.sale?.method` primeiro:

**Arquivos:**
- `supabase/functions/webhook-greenn-artes/index.ts`
- `supabase/functions/webhook-greenn/index.ts`
- `supabase/functions/webhook-greenn-musicos/index.ts`
- `supabase/functions/webhook-greenn-creditos/index.ts`

**Mudança (mesma em todos):**
```typescript
// ANTES
payment_method: payload.sale?.payment_method || payload.payment?.method || null

// DEPOIS
payment_method: payload.sale?.method || payload.sale?.payment_method || payload.payment?.method || null
```

### 2. Backfill: atualizar registros antigos via migração SQL

Executar uma migração que extrai `sale.method` do payload JSON salvo para preencher os registros antigos que têm `payment_method IS NULL`:

```sql
UPDATE webhook_logs
SET payment_method = payload->'sale'->>'method'
WHERE payment_method IS NULL
  AND payload->'sale'->>'method' IS NOT NULL;
```

### 3. Melhorar mapeamento de labels no componente SalesPaymentDonut

Adicionar os valores que a Greenn realmente envia ao `PAYMENT_LABELS`:

```typescript
const PAYMENT_LABELS: Record<string, string> = {
  // ... existentes ...
  PIX: "Pix",
  CREDIT_CARD: "Cartão de Crédito",
  NEQUI: "Nequi",
};
```

---

## Resultado esperado

- Novas vendas terão `payment_method` preenchido corretamente
- Vendas antigas serão retroativamente corrigidas via backfill
- O gráfico "Vendas por Pagamento" não mostrará mais "N/A" em massa

