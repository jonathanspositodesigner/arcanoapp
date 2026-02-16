

# Corrigir login de herica@admin.com

## Problema
O campo `password_changed` esta `false` na tabela `profiles`. Isso forca o redirecionamento para `/change-password`, que tenta enviar um link de recuperacao por email.

## Correcao
Executar um UPDATE simples no banco:

```sql
UPDATE profiles 
SET password_changed = true 
WHERE email = 'herica@admin.com';
```

## Resultado
- Login direto sem redirecionamento para troca de senha
- Sem necessidade de alterar codigo

