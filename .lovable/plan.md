
# Plano de Correção: Fluxo de Login para Usuários com Primeiro Acesso

## Problema Identificado

O usuário `hebertbelmontt2026@gmail.com` existe no sistema com:
- Conta auth criada com senha personalizada (provavelmente via signup anterior)
- Profile com `password_changed = false` (definido quando foi adicionado aos packs manualmente)
- Quando tenta fazer login, o sistema tenta login automático com email como senha, falha, e mostra "Erro ao fazer login" genérico

## Causa Raiz

O fluxo atual assume que todo usuário com `password_changed = false` tem senha = email. Mas isso não é verdade quando:
1. Usuário fez signup com senha própria ANTES de ser adicionado aos packs
2. Admin cadastrou usuário que já existia no sistema

## Solução Proposta

Modificar o `HomeAuthModal.tsx` para tratar o cenário onde o login automático falha:

### Lógica Atual (Problemática)
```
Se profile existe E password_changed = false:
  → Tenta login automático com email como senha
  → Se falhar: mostra "Erro ao fazer login" ❌
```

### Lógica Corrigida
```
Se profile existe E password_changed = false:
  → Tenta login automático com email como senha
  → Se falhar: 
    - Redireciona para /forgot-password com o email preenchido
    - Mostra mensagem: "Precisamos redefinir sua senha. Verifique seu email."
```

## Arquivos a Modificar

1. **`src/components/HomeAuthModal.tsx`** (linhas 95-109)
   - Alterar o tratamento de erro do login automático
   - Ao invés de mostrar toast de erro genérico, redirecionar para recuperação de senha

## Mudanças Técnicas

```typescript
// ANTES (linhas 95-109):
if (profileExists && !passwordChanged) {
  const { error: autoLoginError } = await supabase.auth.signInWithPassword({
    email: loginEmail.trim().toLowerCase(),
    password: loginEmail.trim().toLowerCase(),
  });
  
  if (!autoLoginError) {
    toast.success(t('auth.firstAccessSetPassword'));
    onClose();
    window.location.href = '/change-password?redirect=/';
  } else {
    toast.error(t('auth.loginError')); // ← PROBLEMA AQUI
  }
  return;
}

// DEPOIS:
if (profileExists && !passwordChanged) {
  const { error: autoLoginError } = await supabase.auth.signInWithPassword({
    email: loginEmail.trim().toLowerCase(),
    password: loginEmail.trim().toLowerCase(),
  });
  
  if (!autoLoginError) {
    toast.success(t('auth.firstAccessSetPassword'));
    onClose();
    window.location.href = '/change-password?redirect=/';
  } else {
    // Login automático falhou - senha não é o email
    // Enviar para recuperação de senha
    toast.info(t('auth.needPasswordReset') || 'Precisamos redefinir sua senha');
    onClose();
    window.location.href = `/forgot-password?email=${encodeURIComponent(loginEmail.trim())}`;
  }
  return;
}
```

## Benefícios

1. Usuários que tiveram conta criada de formas diferentes podem recuperar acesso
2. Mensagem clara ao usuário sobre o que fazer
3. Fluxo suave: vai direto para recuperação de senha com email preenchido
4. Após redefinir senha, o profile.password_changed será marcado como true

## Solução Alternativa (para esse usuário específico)

Se quiser resolver imediatamente para o `hebertbelmontt2026@gmail.com`, posso:
1. Resetar a senha dele para ser igual ao email via SQL/edge function
2. OU marcar o password_changed como true (assim ele vai para o step 2 de digitar senha)

Qual abordagem prefere?
