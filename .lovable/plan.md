

# Proxy de Redirecionamento: Pagar.me → Mercado Pago (Planos-2)

## Problema
Usuários com cache antigo do frontend podem ainda chamar `create-pagarme-checkout` com slugs de planos/créditos. Precisamos interceptar essas chamadas e redirecionar para `create-mp-checkout` sem afetar os packs da biblioteca de artes que ainda usam Pagar.me.

## Solução

Adicionar um bloco no início da Edge Function `create-pagarme-checkout` que:

1. Lê o `product_slug` do body
2. Verifica se pertence à lista de slugs migrados (planos + créditos)
3. Se sim, faz um proxy transparente para `create-mp-checkout`, mapeando os campos do payload (ex: `user_cpf` → `user_document`, `user_email` → `user_email`)
4. Retorna a resposta do MP diretamente ao cliente
5. Se não, continua o fluxo normal do Pagar.me (packs de artes)

### Slugs migrados (proxy ativo)
```
plano-starter-mensal, plano-starter-anual
plano-pro-mensal, plano-pro-anual
plano-ultimate-mensal, plano-ultimate-anual
plano-unlimited-mensal, plano-unlimited-anual
creditos-1500, creditos-4200, creditos-14000
```

### Arquivo editado
- `supabase/functions/create-pagarme-checkout/index.ts` — adicionar bloco de proxy logo após o parse do JSON (antes da validação de email), ~15 linhas

### Mapeamento de campos
| Pagar.me (entrada) | Mercado Pago (saída) |
|---|---|
| `product_slug` | `product_slug` |
| `user_email` | `user_email` |
| `user_name` | `user_name` |
| `user_cpf` | `user_document` |
| `utm_data` | `utm_data` |
| `fbp` | `fbp` |
| `fbc` | `fbc` |

O campo `user_phone` e `user_address` são ignorados pois o MP não os usa.

### O que NÃO muda
- Packs da biblioteca de artes (vol1, vol2, vol3, vol4, etc.) continuam usando Pagar.me normalmente
- Nenhum outro arquivo é alterado
- Deploy apenas de `create-pagarme-checkout`

