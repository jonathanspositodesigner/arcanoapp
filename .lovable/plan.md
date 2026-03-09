

# Correção: Mover assinatura IA Unlimited para o perfil correto

## Problema
A cliente digitou `@gmaul.com` no checkout da Greenn. O webhook criou um perfil novo com esse typo e ativou a assinatura lá. O perfil real dela (`@gmail.com`, criado em 14/fev) ficou sem acesso.

## Dados

| Perfil | Email | User ID | Situação |
|---|---|---|---|
| Errado | `@gmaul.com` | `5da17f98-...` | Tem a assinatura Unlimited + 99.999 créditos |
| Real | `@gmail.com` | `ffe10744-...` | Sem assinatura, apenas 60 créditos |
| Outro typo | `@glaul.com` | `c87b9342-...` | Vazio, pode ser ignorado |

## Ações (via SQL migration)

1. **Atualizar `planos2_subscriptions`**: mudar `user_id` de `5da17f98...` para `ffe10744...`
2. **Atualizar `upscaler_credits`** do perfil real: setar `monthly_balance = 99999`, `balance = 99999 + 60` (manter os 60 lifetime dela)
3. **Limpar créditos do perfil errado**: zerar o registro de créditos do `@gmaul.com`

Nenhuma alteração de código é necessária — isso é puramente um problema de dados causado por typo no email do checkout.

