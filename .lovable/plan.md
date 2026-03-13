

# Correção: Vendas Hotmart e Greenn Artes não enviam eventos para Meta CAPI

## Diagnóstico

O `meta-capi-event` (que envia Purchase para o Facebook e grava em `meta_capi_logs`) **só é chamado pelo `webhook-pagarme`**. Os outros 3 webhooks de venda nunca chamam essa função:

- `webhook-greenn` (conta principal Greenn/PromptClub) — **sem CAPI**
- `webhook-greenn-artes` (pack de agendas/artes) — **sem CAPI**
- `webhook-hotmart-artes` (Hotmart ES) — **sem CAPI**

Por isso os logs de CAPI no monitor só mostram vendas do Pagar.me.

## Solução

Adicionar chamada ao `meta-capi-event` nos 3 webhooks, usando a mesma lógica do `webhook-pagarme` (fire-and-forget, com UTM data, event_id para deduplicação).

### 1. `webhook-greenn/index.ts` — Após linha ~657 (mark success)
Adicionar bloco de chamada `meta-capi-event` com:
- `event_name: 'Purchase'`
- `email`, `value` (do payload: `payload.sale.amount` ou similar)
- `utm_data` (já extraído via `extractFullUtmData`)
- `event_id: purchase_greenn_{contractId}`
- `event_source_url: 'https://arcanoapp.voxvisual.com.br'`

### 2. `webhook-greenn-artes/index.ts` — Após linha ~1110 (mark success para packs) e ~846 (mark success para créditos)
Mesma lógica, com:
- `value` do payload (`payload.sale?.amount`)
- `utm_data` do `extractFullUtmData(payload)`
- `event_id: purchase_artes_{contractId}`

### 3. `webhook-hotmart-artes/index.ts` — Após linha ~727 (mark success)
Mesma lógica, com:
- `value` do `amountBrl` (já convertido para BRL)
- `utm_data` do `parsedUtmData` (já extraído)
- `event_id: purchase_hotmart_{transaction}`

### Padrão de código (igual ao webhook-pagarme)
```typescript
// Meta CAPI Purchase (fire-and-forget)
try {
  await fetch(`${supabaseUrl}/functions/v1/meta-capi-event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({
      event_name: 'Purchase',
      email,
      value: amount,
      currency: 'BRL',
      utm_data: utmData,
      event_id: `purchase_${source}_${id}`,
      event_source_url: 'https://arcanoapp.voxvisual.com.br',
    }),
  })
} catch (capiErr) {
  console.warn(`⚠️ Meta CAPI Purchase falhou (não-crítico): ${capiErr.message}`)
}
```

## Arquivos modificados
- `supabase/functions/webhook-greenn/index.ts`
- `supabase/functions/webhook-greenn-artes/index.ts`
- `supabase/functions/webhook-hotmart-artes/index.ts`

## Impacto
- Todas as 3 contas de anúncios passarão a enviar Purchase para o Facebook
- Os logs aparecerão no monitor de CAPI
- Deduplicação garantida via `event_id` único por fonte + ID da transação

