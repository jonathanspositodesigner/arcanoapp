

# Confirmar Email de Todos os Usuários

## O que será feito

Executar um SQL para confirmar o email de todos os 4 usuários que estão com `email_confirmed_at = NULL`.

## SQL a ser executado

```sql
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;
```

## Resultado esperado

Após a execução:
- Os 4 usuários terão seus emails confirmados
- O `aliados.sj@gmail.com` (e os outros 3) poderão fazer login normalmente
- Usuários criados no futuro já serão confirmados automaticamente (pois o "Auto-confirm Email" está ativado)

## Observação

Esse é um UPDATE na tabela `auth.users` que é gerenciada pelo Supabase. Você precisará executar isso através do **Cloud View > Run SQL** no painel do Lovable Cloud.

