

## Diagnóstico do Bug

O problema está na linha 152 do edge function:

```typescript
skip_checkout_success_page: true,
```

Esse parâmetro diz ao Pagar.me para **pular a página de sucesso do checkout** — mas o efeito colateral é que, assim que o usuário clica "Concluir" na tela do checkout hosted, o Pagar.me **redireciona imediatamente para a `success_url`** sem esperar o pagamento ser processado. No caso do PIX, o QR code/chave PIX nunca é exibido porque o redirect acontece antes.

Além disso, a `success_url` tem um formato com query string duplicada:
```
?payment=success?order_id=...
```
Deveria ser `&order_id=...` em vez do segundo `?`, mas isso é secundário.

## Solução

1. **Remover `skip_checkout_success_page: true`** — isso permite que o Pagar.me exiba a tela do PIX (QR code + chave copia-e-cola) e só redirecione para a `success_url` após o pagamento ser confirmado.

2. Opcionalmente, condicionar: para PIX, `skip_checkout_success_page: false` (precisa ver o QR); para cartão, pode ser `true` (pagamento é instantâneo).

### Alteração: `supabase/functions/create-pagarme-checkout/index.ts`

Remover ou setar `skip_checkout_success_page: false` (linha 152). O resto do código permanece igual.

