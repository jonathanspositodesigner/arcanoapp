
# Plano: Login em Dois Passos com Verificação de Senha

## Resumo

Transformar o fluxo de login em todas as plataformas para um processo de dois passos:

1. **Passo 1**: Usuário insere apenas o email e clica em "Continuar"
2. **Passo 2**: 
   - Se o usuário **tem senha cadastrada** (`password_changed = true`): Mostra campo de senha + link "Esqueceu sua senha?"
   - Se o usuário **não tem senha** (`password_changed = false`): Redireciona para criar senha
   - Se o email **não existe**: Oferece opção de criar conta

---

## Fluxo Visual

```text
┌──────────────────────────────────────────────┐
│            PASSO 1: Email                     │
│                                               │
│   Email: [________________________]           │
│                                               │
│          [     Continuar →     ]              │
│                                               │
│   ────────── ou ──────────                    │
│   [ Criar conta ]                             │
└──────────────────────────────────────────────┘
                    │
                    ▼
     ┌──────────────────────────────┐
     │  check_profile_exists(email) │
     └──────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    [Existe e    [Existe e    [Não 
     tem senha]   SEM senha]   existe]
        │           │           │
        ▼           ▼           ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │ Passo 2 │  │ Redireciona│ │ Modal de│
   │ Senha   │  │/change-   │ │ Signup  │
   │         │  │password   │ └─────────┘
   └─────────┘  └─────────┘

┌──────────────────────────────────────────────┐
│            PASSO 2: Senha                     │
│                                               │
│   Logando como: usuario@email.com  [Trocar]   │
│                                               │
│   Senha: [________________________]           │
│                                               │
│          [ Esqueceu sua senha? ]              │
│                                               │
│          [      Entrar →      ]               │
└──────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Plataforma | Alteração |
|---------|------------|-----------|
| `src/pages/UserLogin.tsx` | Biblioteca de Prompts | Fluxo dois passos completo |
| `src/pages/UserLoginArtes.tsx` | Biblioteca de Artes | Fluxo dois passos completo |
| `src/pages/UserLoginArtesMusicos.tsx` | Biblioteca de Artes Músicos | Fluxo dois passos completo |
| `src/components/HomeAuthModal.tsx` | Modal página inicial | Fluxo dois passos na aba login |
| `src/pages/BibliotecaArtes.tsx` | Primeiro acesso inline | Adaptar para novo fluxo |
| `src/pages/FerramentasIA.tsx` | Primeiro acesso inline | Adaptar para novo fluxo |
| `src/pages/FerramentasIAES.tsx` | Primeiro acesso inline ES | Adaptar para novo fluxo |

---

## Implementação Técnica

### Novos Estados para Cada Componente de Login

```tsx
// Estado do fluxo
const [loginStep, setLoginStep] = useState<'email' | 'password'>('email');
const [verifiedEmail, setVerifiedEmail] = useState("");
const [isCheckingEmail, setIsCheckingEmail] = useState(false);
```

### Função de Verificação de Email (Passo 1)

```tsx
const handleEmailCheck = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!email.trim()) {
    toast.error(t('errors.enterEmail'));
    return;
  }
  
  setIsCheckingEmail(true);
  
  try {
    // Verificar se email existe e status de senha
    const { data: profileCheck, error } = await supabase
      .rpc('check_profile_exists', { check_email: email.trim() });
    
    if (error) throw error;
    
    const profileExists = profileCheck?.[0]?.exists_in_db || false;
    const passwordChanged = profileCheck?.[0]?.password_changed || false;
    
    if (!profileExists) {
      // Email não encontrado - oferecer signup
      toast.info(t('errors.emailNotFoundSignup'));
      setSignupEmail(email.trim());
      setShowSignupModal(true);
      return;
    }
    
    if (profileExists && !passwordChanged) {
      // Primeiro acesso - redirecionar para criar senha
      // Fazer login automático com email=password
      const { error: autoLoginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: email.trim()
      });
      
      if (!autoLoginError) {
        toast.success(t('errors.firstAccessSetPassword'));
        navigate(`/change-password?redirect=${redirectTo}`);
      } else {
        // Fallback caso login automático falhe
        toast.error(t('errors.firstAccessContactSupport'));
      }
      return;
    }
    
    // Email existe e tem senha - ir para passo 2
    setVerifiedEmail(email.trim());
    setLoginStep('password');
    
  } catch (error) {
    console.error('Erro ao verificar email:', error);
    toast.error(t('errors.checkRegisterError'));
  } finally {
    setIsCheckingEmail(false);
  }
};
```

### Função de Login com Senha (Passo 2)

```tsx
const handlePasswordLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!password) {
    toast.error(t('errors.passwordRequired'));
    return;
  }
  
  setIsLoading(true);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: verifiedEmail,
      password,
    });
    
    if (error) {
      toast.error(t('errors.invalidCredentials'));
      return;
    }
    
    toast.success(t('success.loginSuccess'));
    navigate(redirectTo);
    
  } catch (error) {
    toast.error(t('errors.loginError'));
  } finally {
    setIsLoading(false);
  }
};
```

### Função para Voltar ao Passo 1

```tsx
const handleChangeEmail = () => {
  setLoginStep('email');
  setPassword('');
};
```

---

## UI do Passo 1 (Email)

```tsx
{loginStep === 'email' && (
  <form onSubmit={handleEmailCheck} className="space-y-6">
    <div>
      <Label htmlFor="email">{t('email')}</Label>
      <Input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="seu-email@exemplo.com"
        className="mt-2 bg-[#0D0221] border-purple-500/30 text-white"
        required
        autoFocus
      />
    </div>
    
    <Button
      type="submit"
      disabled={isCheckingEmail}
      className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
    >
      {isCheckingEmail ? t('checking') : t('continue')}
    </Button>
  </form>
)}
```

---

## UI do Passo 2 (Senha)

```tsx
{loginStep === 'password' && (
  <form onSubmit={handlePasswordLogin} className="space-y-6">
    {/* Indicador de email verificado */}
    <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-purple-400" />
        <span className="text-sm text-purple-200">{verifiedEmail}</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleChangeEmail}
        className="text-purple-400 hover:text-white text-xs"
      >
        {t('changeEmail')}
      </Button>
    </div>
    
    <div>
      <Label htmlFor="password">{t('password')}</Label>
      <div className="relative mt-2">
        <Input
          id="password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="bg-[#0D0221] border-purple-500/30 text-white"
          required
          autoFocus
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
    
    <Button
      type="submit"
      disabled={isLoading}
      className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
    >
      {isLoading ? t('signingIn') : t('login')}
    </Button>
    
    <div className="text-center">
      <Link 
        to={`/forgot-password?email=${encodeURIComponent(verifiedEmail)}`}
        className="text-sm text-purple-400 hover:text-purple-300"
      >
        {t('forgotPassword')}
      </Link>
    </div>
  </form>
)}
```

---

## Adaptações por Plataforma

### UserLogin.tsx (Prompts)
- Redirect: `/change-password`
- Forgot Password: `/forgot-password`
- Tema: roxo escuro (#0D0221)

### UserLoginArtes.tsx (Artes)
- Redirect: `/change-password-artes`
- Forgot Password: `/forgot-password-artes`
- Tema: azul/âmbar

### UserLoginArtesMusicos.tsx (Músicos)
- Redirect: `/change-password-artes-musicos`
- Forgot Password: `/forgot-password-artes-musicos`
- Tema: violeta

### HomeAuthModal.tsx
- Fluxo inline na aba de login
- Redirect: `/change-password?redirect=/`
- Fecha modal e redireciona

### BibliotecaArtes, FerramentasIA, FerramentasIAES
- Adaptar modais de primeiro acesso existentes
- Manter consistência com novo fluxo

---

## Textos i18n a Adicionar

```json
{
  "continue": "Continuar",
  "checking": "Verificando...",
  "changeEmail": "Trocar email",
  "emailVerified": "Email verificado",
  "enterPasswordToLogin": "Digite sua senha para entrar",
  "firstAccessCreatePassword": "Primeiro acesso detectado! Vamos criar sua senha.",
  "errors.passwordRequired": "Digite sua senha"
}
```

---

## Benefícios do Novo Fluxo

1. **UX Simplificada**: Usuário não precisa lembrar se tem senha ou não
2. **Primeiro Acesso Automático**: Sistema detecta automaticamente e redireciona
3. **Menos Erros**: Reduz tentativas de login com senha errada
4. **Feedback Claro**: Usuário sabe exatamente o status da conta
5. **Recuperação Fácil**: Link de "esqueci senha" aparece apenas quando relevante
