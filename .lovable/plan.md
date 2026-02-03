
# Centralização do Fluxo de Autenticação

## Problema Atual

O site tem **código duplicado e lógicas diferentes** em pelo menos **10+ arquivos** que lidam com login:

| Arquivo | Lógica Atual |
|---------|-------------|
| `HomeAuthModal.tsx` | Check email → primeiro acesso → auto-login ou link → passo 2 senha |
| `UserLogin.tsx` | Check email → primeiro acesso → auto-login ou link → passo 2 senha |
| `UserLoginArtes.tsx` | Check email → primeiro acesso → auto-login ou link → passo 2 senha |
| `UserLoginArtesMusicos.tsx` | Check email → primeiro acesso → auto-login ou link → passo 2 senha |
| `BibliotecaArtes.tsx` | Check email → primeiro acesso → auto-login ou link |
| `FerramentasIA.tsx` | Check email → primeiro acesso → auto-login ou link |
| `FerramentasIAES.tsx` | Check email → primeiro acesso → auto-login ou link |
| `PartnerLogin.tsx` | Login direto (email + senha) - sem check |
| `PartnerLoginArtes.tsx` | Login direto (email + senha) - sem check |
| `PartnerLoginUnified.tsx` | Login direto (email + senha) - sem check |
| `AdminLogin.tsx` | Login direto + 2FA (especial) |

### Problemas Identificados:
1. Código duplicado (100+ linhas repetidas em cada arquivo)
2. Lógica de `handleEmailCheck` replicada em todos os arquivos
3. Lógica de `handlePasswordLogin` replicada
4. Lógica de `handleSignup` replicada
5. Rotas de redirecionamento diferentes mas lógica igual
6. Difícil manutenção (alterar em um, tem que alterar em todos)

---

## Solução: Hook Centralizado + Componentes Reutilizáveis

### 1. Criar Hook Central: `useUnifiedAuth`

Arquivo: `src/hooks/useUnifiedAuth.ts`

Este hook vai encapsular toda a lógica de autenticação:

```typescript
type AuthConfig = {
  // Rotas de redirecionamento por plataforma
  changePasswordRoute: string;     // Ex: '/change-password-artes'
  loginRoute: string;              // Ex: '/login-artes'
  forgotPasswordRoute: string;     // Ex: '/forgot-password-artes'
  defaultRedirect: string;         // Ex: '/biblioteca-artes'
  
  // Callbacks opcionais
  onLoginSuccess?: () => void;
  onSignupSuccess?: () => void;
  onNeedPasswordChange?: () => void;
  
  // Validações extras (para logins especiais como partner/admin)
  postLoginValidation?: (user: User) => Promise<{ valid: boolean; error?: string }>;
};

type AuthState = {
  step: 'email' | 'password' | 'signup' | 'waiting-link';
  email: string;
  verifiedEmail: string;
  isLoading: boolean;
  error: string | null;
};

// Retorno do hook
{
  // Estado
  state: AuthState;
  
  // Ações
  checkEmail: (email: string) => Promise<void>;
  loginWithPassword: (password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  resendLink: () => Promise<void>;
  changeEmail: () => void;
  
  // Helpers
  setEmail: (email: string) => void;
}
```

### 2. Fluxo Unificado

O hook implementa exatamente a lógica que você pediu:

```text
┌─────────────────────────────────────────────────────────────┐
│                     PASSO 1: EMAIL                          │
│                                                             │
│   Usuário digita email → checkEmail()                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  check_profile_exists  │
              │        (RPC)           │
              └────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │ NÃO EXISTE │  │ EXISTE +   │  │ EXISTE +   │
    │            │  │ password   │  │ password   │
    │            │  │ _changed   │  │ _changed   │
    │            │  │ = false    │  │ = true     │
    └────────────┘  └────────────┘  └────────────┘
           │               │               │
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │ Ir para    │  │ Auto-login │  │ Ir para    │
    │ aba de     │  │ email=     │  │ PASSO 2:   │
    │ SIGNUP     │  │ senha      │  │ SENHA      │
    └────────────┘  └────────────┘  └────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
                    ▼             ▼
            ┌────────────┐ ┌────────────┐
            │ SUCESSO    │ │ FALHOU     │
            │            │ │            │
            │ → change-  │ │ → envia    │
            │   password │ │   link     │
            │            │ │ → change-  │
            │            │ │   password │
            │            │ │   ?sent=1  │
            └────────────┘ └────────────┘
```

### 3. Componentes UI Reutilizáveis

Criar componentes que podem ser estilizados por plataforma:

**Arquivo: `src/components/auth/LoginEmailStep.tsx`**
- Campo de email
- Botão "Continuar"
- Link para signup

**Arquivo: `src/components/auth/LoginPasswordStep.tsx`**
- Indicador do email verificado
- Campo de senha
- Botão "Entrar"
- Link "Esqueci minha senha"
- Botão "Trocar email"

**Arquivo: `src/components/auth/SignupForm.tsx`**
- Campos: email, nome, senha, confirmar senha
- Botão "Criar conta"

**Arquivo: `src/components/auth/WaitingLinkState.tsx`**
- Mensagem "Enviamos um link para seu email"
- Botão "Reenviar link"
- Botão "Usar outro email"

---

## Arquivos que Serão Criados

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useUnifiedAuth.ts` | Hook central com toda a lógica |
| `src/components/auth/LoginEmailStep.tsx` | Componente do passo 1 (email) |
| `src/components/auth/LoginPasswordStep.tsx` | Componente do passo 2 (senha) |
| `src/components/auth/SignupForm.tsx` | Componente de cadastro |
| `src/components/auth/WaitingLinkState.tsx` | Componente de "aguardando link" |
| `src/components/auth/AuthContainer.tsx` | Container wrapper com estilos |

## Arquivos que Serão Refatorados

| Arquivo | Mudança |
|---------|---------|
| `src/components/HomeAuthModal.tsx` | Usar `useUnifiedAuth` + componentes |
| `src/pages/UserLogin.tsx` | Usar `useUnifiedAuth` + componentes |
| `src/pages/UserLoginArtes.tsx` | Usar `useUnifiedAuth` + componentes |
| `src/pages/UserLoginArtesMusicos.tsx` | Usar `useUnifiedAuth` + componentes |
| `src/pages/BibliotecaArtes.tsx` | Usar `useUnifiedAuth` no modal |
| `src/pages/FerramentasIA.tsx` | Usar `useUnifiedAuth` no modal |
| `src/pages/FerramentasIAES.tsx` | Usar `useUnifiedAuth` no modal |
| `src/pages/PartnerLogin.tsx` | Usar `useUnifiedAuth` com `postLoginValidation` |
| `src/pages/PartnerLoginArtes.tsx` | Usar `useUnifiedAuth` com `postLoginValidation` |
| `src/pages/PartnerLoginUnified.tsx` | Usar `useUnifiedAuth` com `postLoginValidation` |
| `src/lib/firstAccess.ts` | Será absorvido pelo hook |
| `src/pages/ChangePassword.tsx` | Manter como está |
| `src/pages/ChangePasswordArtes.tsx` | Manter como está |
| `src/pages/ChangePasswordArtesMusicos.tsx` | Manter como está |

**Nota:** O `AdminLogin.tsx` será mantido separado por ter lógica de 2FA especial.

---

## Exemplo de Uso Após Refatoração

### UserLoginArtes.tsx (de ~450 linhas para ~50 linhas)

```typescript
const UserLoginArtes = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/biblioteca-artes';

  const auth = useUnifiedAuth({
    changePasswordRoute: '/change-password-artes',
    loginRoute: '/login-artes',
    forgotPasswordRoute: '/forgot-password-artes',
    defaultRedirect: redirectTo,
    onLoginSuccess: () => navigate(redirectTo),
  });

  return (
    <AuthContainer theme="artes">
      {auth.state.step === 'email' && (
        <LoginEmailStep
          email={auth.state.email}
          onEmailChange={auth.setEmail}
          onSubmit={auth.checkEmail}
          onSignupClick={() => auth.showSignup()}
          isLoading={auth.state.isLoading}
        />
      )}
      
      {auth.state.step === 'password' && (
        <LoginPasswordStep
          email={auth.state.verifiedEmail}
          onSubmit={auth.loginWithPassword}
          onChangeEmail={auth.changeEmail}
          forgotPasswordUrl={auth.getForgotPasswordUrl()}
          isLoading={auth.state.isLoading}
        />
      )}
      
      {auth.state.step === 'signup' && (
        <SignupForm
          defaultEmail={auth.state.email}
          onSubmit={auth.signup}
          onBackToLogin={auth.changeEmail}
          isLoading={auth.state.isLoading}
        />
      )}
      
      {auth.state.step === 'waiting-link' && (
        <WaitingLinkState
          email={auth.state.email}
          onResend={auth.resendLink}
          onChangeEmail={auth.changeEmail}
        />
      )}
    </AuthContainer>
  );
};
```

---

## Benefícios

1. **Código centralizado** - Uma única fonte de verdade para lógica de auth
2. **Fácil manutenção** - Alterar em um lugar, funciona em todos
3. **Consistência** - Mesmo fluxo em todas as plataformas
4. **Testável** - Hook pode ser testado isoladamente
5. **Flexível** - Cada plataforma pode customizar rotas e validações
6. **Redução de código** - De ~450 linhas por arquivo para ~50 linhas

---

## Detalhes Técnicos do Hook

### Estados Internos

```typescript
const [state, setState] = useState<AuthState>({
  step: 'email',
  email: '',
  verifiedEmail: '',
  isLoading: false,
  error: null,
});
```

### Função checkEmail (PASSO 1)

```typescript
const checkEmail = async (email: string) => {
  const normalized = email.trim().toLowerCase();
  
  // 1. Chamar RPC check_profile_exists
  const { exists, passwordChanged } = await rpc('check_profile_exists', normalized);
  
  // 2. Não existe → signup
  if (!exists) {
    setState({ step: 'signup', email: normalized });
    return;
  }
  
  // 3. Existe mas não mudou senha → primeiro acesso
  if (!passwordChanged) {
    // Tentar auto-login
    const { error } = await signInWithPassword(normalized, normalized);
    if (!error) {
      navigate(`${config.changePasswordRoute}?redirect=${config.defaultRedirect}`);
      return;
    }
    
    // Auto-login falhou → enviar link
    await resetPasswordForEmail(normalized, { redirectTo: ... });
    navigate(`${config.changePasswordRoute}?sent=1&email=${normalized}&redirect=${config.defaultRedirect}`);
    return;
  }
  
  // 4. Existe e tem senha → passo 2
  setState({ step: 'password', verifiedEmail: normalized });
};
```

### Função loginWithPassword (PASSO 2)

```typescript
const loginWithPassword = async (password: string) => {
  // 1. Tentar login
  const { data, error } = await signInWithPassword(state.verifiedEmail, password);
  if (error) {
    toast.error('Credenciais inválidas');
    return;
  }
  
  // 2. Validação extra (para partners/admins)
  if (config.postLoginValidation) {
    const { valid, error } = await config.postLoginValidation(data.user);
    if (!valid) {
      await signOut();
      toast.error(error);
      return;
    }
  }
  
  // 3. Verificar se precisa mudar senha
  const { password_changed } = await getProfile(data.user.id);
  if (!password_changed) {
    navigate(`${config.changePasswordRoute}?redirect=${config.defaultRedirect}`);
    return;
  }
  
  // 4. Sucesso!
  config.onLoginSuccess?.();
};
```

### Função signup

```typescript
const signup = async (data: SignupData) => {
  // 1. Criar usuário
  const { user, error } = await auth.signUp({ ... });
  
  // 2. Criar perfil
  await profiles.upsert({ id: user.id, email, name, password_changed: true });
  
  // 3. Login automático
  await signInWithPassword(email, password);
  
  // 4. Sucesso!
  config.onSignupSuccess?.();
};
```

---

## Ordem de Implementação

1. Criar `useUnifiedAuth.ts` com toda a lógica
2. Criar componentes de UI
3. Refatorar `UserLoginArtes.tsx` primeiro (como teste)
4. Validar que funciona
5. Refatorar os demais arquivos
6. Remover código duplicado do `firstAccess.ts` (absorvido no hook)
7. Testes end-to-end
