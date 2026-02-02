

# Correção do Flag password_changed

## Problema
O usuário `hebertbelmontt2026@gmail.com` tem o flag `password_changed = false` mas já possui uma senha personalizada, causando falha no login automático.

## Solução
Executar um UPDATE simples no banco de dados para corrigir o flag.

## Query SQL
```sql
UPDATE profiles 
SET password_changed = true, 
    updated_at = now() 
WHERE id = '2bbae273-6ecc-43c0-9d77-220b0af07bff';
```

## Resultado Esperado
Após a correção, o usuário vai:
1. Digitar o email no Step 1
2. Ver o campo de senha no Step 2 (porque `password_changed = true`)
3. Digitar a senha que ele já cadastrou
4. Fazer login normalmente

## Ação Necessária
Como estou em modo de leitura, você precisa executar essa query manualmente:

1. Acesse o backend do projeto
2. Execute a query SQL acima
3. Usuário poderá fazer login normalmente

