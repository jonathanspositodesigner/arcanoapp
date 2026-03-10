

## Problema

O `HomeAuthModal.tsx` mistura dois namespaces i18n:

- **`index`** namespace: tem `auth.signupSuccessTitle`, `auth.welcomeTitle`, etc. (keys simples)
- **`auth`** namespace: tem `errors.emailAlreadyRegistered`, `success.*`, etc. (keys aninhadas)

O hook `useUnifiedAuth` recebe `t: (key) => t('auth.${key}', key)` — quando o hook tenta resolver `errors.emailAlreadyRegistered`, vira-se `t('auth.errors.emailAlreadyRegistered')` no namespace `index`, que **não existe lá**. Resultado: chaves cruas aparecem na tela.

## Correção

**`src/components/HomeAuthModal.tsx`** — Remover toda    dependência de i18n e usar strings PT hardcoded.

Este modal é usado apenas no contexto brasileiro. Simplificar eliminando   traduções:

1. Remover `useTranslation` import e chamada    this
2. Hardcode todas   as strings em português diretamente no JSX e nas labels/props
3. Para o `t` passado ao `useUnifiedAuth`, usar `useTranslation('auth')` separadamente para que o hook resolva corretamente `errors.*` e `success.*`

Resultado: o modal da Home não depende mais de resolução de namespace para textos visíveis, e o hook recebe o `t` correto do namespace `auth`.

### Mudanças concretas

```typescript
// Antes:
const { t } = useTranslation('index');
// ...
t: (key: string) => t(`auth.${key}`, key),

// Depois:
const { t: tAuth } = useTranslation('auth');
// ...
t: (key: string) => tAuth(key, key),
```

E no JSX, trocar todas as chamadas `t('auth.xxx')` por strings diretas:
- `t('auth.signupSuccessTitle')` → `"Verifique seu E-mail!"`
- `t('auth.signupSuccessMessage')` → `"Enviamos um link de confirmação para:"`
- `t('auth.signupSuccessInstruction')` → `"Clique no link do e-mail para ativar sua conta e fazer login."`
- `t('auth.signupSuccessSpam')` → `"Não encontrou? Verifique a pasta de spam."`
- `t('auth.backToLogin')` → `"Voltar para Login"`
- `t('auth.welcomeTitle')` → `"Bem-vindo ao Arcano!"` (do index.json)
- `t('auth.welcomeSubtitle')` → `"Faça login ou crie sua conta"` (do index.json)
- Labels do `LoginEmailStep` e `LoginPasswordStep` → strings diretas em PT
- `t('auth.browseWithoutLogin')` → `"Navegar sem login"`

**Arquivo alterado**: apenas `src/components/HomeAuthModal.tsx`

