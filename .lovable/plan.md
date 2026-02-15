

# Corrigir Bug: `productId is not defined` no Email de Créditos

## Problema Identificado
O erro **`productId is not defined`** ocorre na função `processCreditsWebhook` (linha 748) porque a variável `productId` existe apenas no escopo do handler principal (linha 774), mas **nunca e passada** para `processCreditsWebhook`.

A funcao `processCreditsWebhook` recebe apenas 5 parametros:
```
supabase, payload, logId, requestId, creditsProduct
```

Mas na linha 748, tenta usar `productId` que nao existe nesse escopo.

## Correcao

**Arquivo:** `supabase/functions/webhook-greenn-artes/index.ts`

### Passo 1: Extrair `productId` do payload dentro de `processCreditsWebhook`

Na linha 610 (logo apos `const userLocale = ...`), adicionar:

```typescript
const productId = payload.product?.id
```

Isso resolve o problema sem alterar a assinatura da funcao nem a chamada na linha 865.

### Passo 2: Redeploy da Edge Function

Deploy automatico apos salvar.

## Resultado Esperado
- O `productId` sera extraido do payload (ja disponivel)
- A funcao `sendCreditsWelcomeEmail` recebera o ID correto do produto
- O template do email do Upscaler Arcano sera renderizado corretamente
- Proximo webhook teste deve enviar o email com sucesso

## Detalhes Tecnicos
- Apenas **1 linha** precisa ser adicionada
- Nenhuma mudanca na assinatura de funcoes
- Nenhuma mudanca nas chamadas existentes
- A variavel `payload` ja contem `product.id` (confirmado nos logs: `productId=156960`)

