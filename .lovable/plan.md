

## Plano: Corrigir webhook Pagar.me para processar todos os eventos corretamente

### Problema principal

O webhook está configurado corretamente no painel do Pagar.me (todos os eventos de cobrança habilitados). O código já trata `charge.refunded`, mas há um problema crítico: **para eventos de charge (como `charge.refunded`), o Pagar.me envia o objeto da charge como `data`, e NÃO o objeto da order**. A metadata com `order_id` pode não estar presente no caminho esperado.

Quando o `order_id` não é encontrado (linha 215), o webhook retorna "OK" sem processar — **descartando silenciosamente o reembolso**.

### Solução

Adicionar um **fallback de busca por `asaas_payment_id`** quando o `order_id` não for encontrado no metadata. Durante o pagamento, o sistema salva `asaas_payment_id = eventData.id || charge.id`. No reembolso, o `eventData.id` é o mesmo charge ID, então podemos localizar a ordem por esse campo.

### Alterações em `supabase/functions/webhook-pagarme/index.ts`

1. **Após extrair `orderId` do metadata (linha ~215)**: se `orderId` for null E o evento for de reembolso/cancelamento, buscar a ordem na tabela `asaas_orders` pelo campo `asaas_payment_id` usando `eventData.id` como chave
2. **Remover a restrição de status no bloco de reembolso**: o status `paid` é o mais comum, mas também tratar ordens que já estejam em outros estados (ex: se o webhook chegar duplicado)
3. **Adicionar tratamento para `charge.paid` sem metadata**: mesma lógica de fallback por `asaas_payment_id` para garantir robustez

```text
Fluxo atual (quebrado para refunds):
  charge.refunded → eventData = charge object
    → metadata.order_id = null (não existe no charge)
    → "Sem order_id no metadata" → DESCARTA

Fluxo corrigido:
  charge.refunded → eventData = charge object
    → metadata.order_id = null
    → Fallback: busca asaas_orders WHERE asaas_payment_id = eventData.id
    → Encontra ordem → processa reembolso normalmente
```

### Detalhes técnicos

Trecho novo (após linha ~213, substituindo o bloco "sem order_id"):

```typescript
let orderId = eventData?.metadata?.order_id 
  || eventData?.order?.metadata?.order_id 
  || eventData?.charges?.[0]?.metadata?.order_id 
  || null

// Fallback: buscar por asaas_payment_id (charge ID salvo no pagamento)
let order = null
let product = null

if (orderId) {
  const { data, error } = await supabase
    .from('asaas_orders')
    .select('*, mp_products(*)')
    .eq('id', orderId)
    .single()
  if (!error && data) { order = data; product = data.mp_products }
}

if (!order && eventData?.id) {
  const { data, error } = await supabase
    .from('asaas_orders')
    .select('*, mp_products(*)')
    .eq('asaas_payment_id', eventData.id)
    .maybeSingle()
  if (!error && data) { 
    order = data; product = data.mp_products; orderId = data.id 
  }
}

if (!order) {
  // logar e retornar OK
}
```

Isso garante que mesmo quando o Pagar.me não inclui metadata no evento de charge, a ordem é encontrada pelo ID da charge que foi salvo durante o pagamento.

