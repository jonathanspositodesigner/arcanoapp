

## Diagnóstico: snfiel7@gmail.com preso no "Primeiro Acesso"

### Causa raiz

O perfil deste usuário tem `password_changed = false`, mesmo ele já tendo senha definida. O fluxo de login (`useUnifiedAuth`) verifica esse campo: se for `false`, redireciona para a página de "Primeiro Acesso" (`/change-password-artes`) em vez de pedir a senha normalmente.

Dados do perfil:
- **email_verified**: true
- **password_changed**: false (incorreto — deveria ser true)
- **Cadastro**: 13/12/2025
- **Última atualização**: 16/02/2026

Provavelmente o campo foi sobrescrito para `false` por algum webhook de compra antes da correção que implementamos para preservar o `password_changed` de usuários existentes.

**Não é um bug atual do sistema** — é um dado inconsistente residual. O sistema de proteção contra sobrescrita já está em vigor.

### Correção

**Migration**: Atualizar o `password_changed` para `true` apenas para este usuário específico.

```sql
UPDATE public.profiles 
SET password_changed = true 
WHERE email = 'snfiel7@gmail.com' AND password_changed = false;
```

Após isso, o login vai funcionar normalmente — o sistema vai pedir a senha e autenticar sem redirecionar para "Primeiro Acesso".

