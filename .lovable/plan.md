

# Plano: Remover EdgeRuntime.waitUntil() de Todos os Webhooks

## Problema
Eu coloquei essa API incompatível (`EdgeRuntime.waitUntil()`) em 3 webhooks de pagamento. Essa API é exclusiva da Vercel e **NÃO FUNCIONA** no Deno/Supabase.

## Arquivos Afetados

| Arquivo | O que remover |
|---------|---------------|
| `webhook-greenn-creditos/index.ts` | Declaração (linhas 15-18) + chamada (linha 514-516) |
| `webhook-hotmart-artes/index.ts` | Chamada (linha 837) + comentário @ts-ignore |
| `webhook-greenn-artes/index.ts` | Chamada (linha 1049) + comentário @ts-ignore |

## Solução

Remover o `EdgeRuntime.waitUntil()` e usar `await` diretamente. O processamento será feito **antes** de retornar a resposta (como estava funcionando antes).

### Mudanças em cada arquivo:

**1. webhook-greenn-creditos/index.ts**
- Remover linhas 15-18 (declaração do tipo)
- Linha 514-516: Trocar `EdgeRuntime.waitUntil(processGreennCreditosWebhook(...))` por `await processGreennCreditosWebhook(...)`

**2. webhook-hotmart-artes/index.ts**
- Linha 837: Trocar `EdgeRuntime.waitUntil(...)` por `await processHotmartWebhook(...)`
- Remover comentário `// @ts-ignore`

**3. webhook-greenn-artes/index.ts**
- Linha 1049: Trocar `EdgeRuntime.waitUntil(...)` por `await processGreennArtesWebhook(...)`
- Remover comentário `// @ts-ignore`

## Resultado Esperado

- Webhooks voltam a funcionar sem erro
- Processamento ocorre normalmente
- Greenn/Hotmart recebem resposta após processamento completo

