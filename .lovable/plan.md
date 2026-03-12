

## Problema

Em `src/pages/UserLogin.tsx` linha 16, o redirect padrão após login é `/biblioteca-prompts`:

```typescript
const redirectTo = searchParams.get('redirect') || '/biblioteca-prompts';
```

Quando a página `/sucesso-compra` redireciona para `/login` (sem query param `?redirect=/`), o login leva o usuário para a Biblioteca de Prompts em vez da Home.

## Correção

**Arquivo: `src/pages/UserLogin.tsx` (linha 16)**

Mudar o fallback de `/biblioteca-prompts` para `/`:

```typescript
const redirectTo = searchParams.get('redirect') || '/';
```

Isso faz com que **todo login pelo `/login`** redirecione para a Home por padrão, a menos que um `?redirect=` específico seja passado na URL.

