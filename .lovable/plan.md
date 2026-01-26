
## Implementar Detecção Automática de Primeiro Acesso no Modal de Login da Página Inicial

### Problema Atual
O modal de login da página inicial (`HomeAuthModal.tsx`) não possui a lógica de detectar se o usuário está fazendo seu **primeiro acesso** (comprou um produto mas nunca definiu uma senha). Atualmente:

1. Se o usuário tentar logar com qualquer senha (certa ou errada) e ele nunca definiu uma senha, o sistema apenas mostra "credenciais inválidas"
2. O usuário fica perdido sem saber que precisa cadastrar uma senha

### Comportamento Esperado

**Fluxo para Primeiro Acesso (na aba "Entrar"):**
1. Usuário digita e-mail e qualquer senha
2. Sistema tenta fazer login
3. Se falhar, sistema verifica no banco se o perfil existe (`check_profile_exists`)
4. Se `password_changed = false`: 
   - Sistema faz login automático usando email como senha (padrão definido nos webhooks)
   - Redireciona para `/change-password?redirect=/`
5. Após cadastrar a senha, volta para a página inicial já logado

**Fluxo para Primeiro Acesso (na aba "Criar Conta"):**
1. Usuário digita e-mail que já existe no sistema
2. Sistema detecta "email já registrado"
3. Verifica se `password_changed = false`
4. Se sim, mesmo comportamento: login automático e redireciona para `/change-password`

### Arquivos a Modificar

#### 1. `src/components/HomeAuthModal.tsx`

**Mudanças na função `handleLogin`:**

```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // ... validação existente ...

  setIsLoading(true);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim().toLowerCase(),
      password: loginPassword,
    });

    if (error) {
      // NOVO: Verificar se é primeiro acesso
      const { data: profileCheck } = await supabase
        .rpc('check_profile_exists', { check_email: loginEmail.trim() });

      const profileExists = profileCheck?.[0]?.exists_in_db || false;
      const passwordChanged = profileCheck?.[0]?.password_changed || false;

      if (profileExists && !passwordChanged) {
        // PRIMEIRO ACESSO: tentar login com email como senha
        const { error: autoLoginError } = await supabase.auth.signInWithPassword({
          email: loginEmail.trim().toLowerCase(),
          password: loginEmail.trim().toLowerCase(), // Senha padrão é o email
        });

        if (!autoLoginError) {
          toast.success(t('auth.firstAccessSetPassword'));
          onClose();
          window.location.href = '/change-password?redirect=/';
          return;
        }
      }

      // Erro normal de credenciais
      if (error.message.includes("Invalid login credentials")) {
        toast.error(t('auth.invalidCredentials'));
      } else if (error.message.includes("Email not confirmed")) {
        toast.error(t('auth.emailNotConfirmed'));
      } else {
        toast.error(error.message);
      }
      return;
    }

    // Login bem sucedido - verificar se precisa mudar senha
    const { data: profile } = await supabase
      .from('profiles')
      .select('password_changed')
      .eq('id', data.user.id)
      .maybeSingle();

    if (!profile || !profile.password_changed) {
      toast.success(t('auth.firstAccessSetPassword'));
      onClose();
      window.location.href = '/change-password?redirect=/';
      return;
    }

    toast.success(t('auth.loginSuccess'));
    onAuthSuccess();
  } catch (error) {
    toast.error(t('auth.loginError'));
  } finally {
    setIsLoading(false);
  }
};
```

**Mudanças na função `handleSignup`:**

```typescript
const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // ... validação existente ...

  setIsLoading(true);
  try {
    const { data, error } = await supabase.auth.signUp({
      // ... código existente ...
    });

    if (error) {
      if (error.message.includes("already registered")) {
        // NOVO: Verificar se é primeiro acesso
        const { data: profileCheck } = await supabase
          .rpc('check_profile_exists', { check_email: signupEmail.trim() });

        const profileExists = profileCheck?.[0]?.exists_in_db || false;
        const passwordChanged = profileCheck?.[0]?.password_changed || false;

        if (profileExists && !passwordChanged) {
          // Tentar login automático com email como senha
          const { error: autoLoginError } = await supabase.auth.signInWithPassword({
            email: signupEmail.trim().toLowerCase(),
            password: signupEmail.trim().toLowerCase(),
          });

          if (!autoLoginError) {
            toast.success(t('auth.firstAccessSetPassword'));
            onClose();
            window.location.href = '/change-password?redirect=/';
            return;
          }
        }

        toast.error(t('auth.emailAlreadyExists'));
      } else {
        toast.error(error.message);
      }
      return;
    }

    // ... resto do código existente ...
  }
};
```

#### 2. `src/locales/pt/index.json`
Adicionar nova tradução:
```json
{
  "auth": {
    // ... traduções existentes ...
    "firstAccessSetPassword": "Primeiro acesso detectado! Por favor, cadastre sua senha."
  }
}
```

#### 3. `src/locales/es/index.json`
Adicionar tradução em espanhol:
```json
{
  "auth": {
    // ... traduções existentes ...
    "firstAccessSetPassword": "¡Primer acceso detectado! Por favor, registre su contraseña."
  }
}
```

### Diagrama do Fluxo

```text
┌─────────────────────────────────────────────────────────────────┐
│                    MODAL DE LOGIN (Index)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Usuário digita email + qualquer senha                           │
│                    │                                              │
│                    ▼                                              │
│            Tenta fazer login                                      │
│                    │                                              │
│         ┌─────────┴──────────┐                                   │
│         │                    │                                    │
│    Login OK            Login FALHOU                               │
│         │                    │                                    │
│         ▼                    ▼                                    │
│  Verifica profile     Chama check_profile_exists                  │
│         │                    │                                    │
│         │           ┌───────┴────────┐                           │
│         │           │                │                            │
│         │      Existe com       Não existe OU                     │
│         │    password_changed   já mudou senha                    │
│         │      = false                │                           │
│         │           │                 │                           │
│         │           ▼                 ▼                           │
│         │   Login automático    Mostra erro                       │
│         │   (email/email)       "credenciais inválidas"           │
│         │           │                                             │
│         │           ▼                                             │
│         ├──────► Redireciona para /change-password?redirect=/    │
│         │           │                                             │
│  Verifica se        │                                             │
│  password_changed   │                                             │
│         │           │                                             │
│    ┌────┴────┐      │                                             │
│    │         │      │                                             │
│  FALSE     TRUE     │                                             │
│    │         │      │                                             │
│    │         ▼      │                                             │
│    │    onAuthSuccess() ──► Fecha modal, fica na página          │
│    │                                                              │
│    └──────► Redireciona para /change-password?redirect=/         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  /change-password                                │
├─────────────────────────────────────────────────────────────────┤
│  1. Usuário cadastra nova senha                                  │
│  2. Sistema atualiza auth + profiles.password_changed = true     │
│  3. Redireciona para "/" (redirect param)                        │
│  4. Usuário já está logado na página inicial                     │
└─────────────────────────────────────────────────────────────────┘
```

### Detalhes Técnicos

**Por que usar `window.location.href` ao invés de `navigate()`?**
- O modal está num contexto React diferente
- O `navigate()` do React Router pode não funcionar bem quando o modal fecha
- O `window.location.href` garante navegação limpa para a página de senha

**Por que verificar após login bem-sucedido também?**
- O usuário pode ter acertado a "senha email" por coincidência
- Ou pode estar usando a senha padrão conscientemente
- Garante que nunca um usuário com `password_changed=false` fique logado sem definir senha

**Por que verificar no signup também?**
- Usuário pode ter sido cadastrado via webhook/admin mas tentar criar conta
- Ao detectar "email já existe", verificamos se é primeiro acesso
- Se for, fazemos login automático e redirecionamos

### Resultado Esperado
1. Usuário que comprou produto tenta logar com qualquer senha
2. Sistema detecta automaticamente que é primeiro acesso
3. Faz login usando email como senha (padrão)
4. Redireciona para cadastrar senha pessoal
5. Após cadastrar, volta para página inicial já autenticado
6. Funciona tanto na aba "Entrar" quanto na aba "Criar Conta"
