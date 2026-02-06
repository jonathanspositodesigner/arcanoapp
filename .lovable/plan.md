
# Plano: Permitir Login de Usuários Não-Premium

## Problema Identificado
O modal de login da página `/login` (usado pela Biblioteca de Prompts) está **bloqueando usuários que não são premium** de fazer login. Isso acontece porque existe uma validação `postLoginValidation` que verifica se o usuário é premium antes de permitir o acesso.

## Comportamento Atual (Errado)
1. Pessoa clica em "Login" na Biblioteca de Prompts
2. Modal abre e pede email
3. Pessoa coloca senha e tenta logar
4. **Sistema verifica se é premium** → Se NÃO for, mostra "Acesso Negado" e desloga a pessoa

## Comportamento Desejado (Correto)
1. Pessoa clica em "Login"
2. Modal abre e pede email
3. Pessoa coloca senha e loga normalmente
4. Depois de logada, se NÃO for premium, continua vendo o botão "Torne-se Premium" para poder assinar

---

## Alterações Necessárias

### Arquivo: `src/pages/UserLogin.tsx`

**Remover a validação premium obrigatória:**

```diff
  const auth = useUnifiedAuth({
    changePasswordRoute: '/change-password',
    loginRoute: '/login',
    forgotPasswordRoute: '/forgot-password',
    defaultRedirect: redirectTo,
    t: (key: string) => t(key),
-   // Premium-specific validation
-   postLoginValidation: async (user) => {
-     const { data: isPremium, error: premiumError } = await supabase.rpc('is_premium');
-     if (premiumError || !isPremium) {
-       return { valid: false, error: t('errors.accessDenied') };
-     }
-     return { valid: true };
-   },
  });
```

**Ajustar o useEffect para NÃO bloquear não-premium (apenas redirecionar se já logado):**

```diff
  useEffect(() => {
-   const checkPremiumStatus = async () => {
+   const checkLoginStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
-       const { data: isPremium } = await supabase.rpc('is_premium');
-       if (isPremium) {
-         const { data: profile } = await supabase
-           .from('profiles')
-           .select('password_changed')
-           .eq('id', user.id)
-           .maybeSingle();
-
-         if (!profile || !profile.password_changed) {
-           navigate(`/change-password?redirect=${redirectTo}`);
-         } else {
-           navigate(redirectTo);
-         }
+       const { data: profile } = await supabase
+         .from('profiles')
+         .select('password_changed')
+         .eq('id', user.id)
+         .maybeSingle();
+
+       if (!profile || !profile.password_changed) {
+         navigate(`/change-password?redirect=${redirectTo}`);
+       } else {
+         navigate(redirectTo);
        }
      }
    };
-   checkPremiumStatus();
+   checkLoginStatus();
  }, [navigate, redirectTo]);
```

---

## Resultado Esperado

Após a alteração:

| Cenário | Comportamento |
|---------|---------------|
| Usuário NÃO premium tenta logar | **PERMITE** login normalmente |
| Após logado (não-premium) | Vê botão "Torne-se Premium" disponível |
| Usuário premium tenta logar | Login normal (igual antes) |
| Usuário já logado acessa /login | Redirecionado automaticamente |

---

## Observações Técnicas

- A lógica de mostrar "Torne-se Premium" já existe no `BibliotecaPrompts.tsx` (linhas 505-510) e continuará funcionando
- O `ToolsHeader.tsx` usa `/login-artes` que JÁ permite não-premium, então Ferramentas de IA não será afetado
- Esta alteração unifica o comportamento: qualquer pessoa pode logar, premium ou não
