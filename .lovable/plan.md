
# Corrigir: Assinantes dos novos planos não aparecem no admin

## Problema

A tabela `planos2_subscriptions` tem RLS (Row Level Security) que só permite cada usuário ver **sua própria** assinatura. Não existe uma policy para admins verem todas as assinaturas. Por isso a aba "Assinantes" aparece vazia para o admin.

Os dados existem no banco (28 registros: 23 Free, 2 Starter, 1 Pro, 1 Ultimate, 1 Unlimited), mas o admin não consegue lê-los.

## Solução

Adicionar uma policy RLS na tabela `planos2_subscriptions` permitindo que admins vejam todos os registros, seguindo o mesmo padrão já usado na tabela `profiles`:

```sql
CREATE POLICY "Admins can view all subscriptions"
ON planos2_subscriptions FOR SELECT
USING (has_role(auth.uid(), 'admin'));
```

Isso é tudo. O código do componente `AdminPlanos2SubscribersTab.tsx` já está correto -- o problema é puramente de permissão no banco.

## Detalhes técnicos

- Uma migration SQL será executada para criar a policy
- Nenhum arquivo de código precisa ser alterado
- A correção é imediata: após aplicar a policy, o admin verá todos os 28 assinantes
