

## Problema

O email **kommybemmmkt@gmail.com** já existe — foi criado em **23 de janeiro de 2026**. Não é bug de cadastro.

O problema real é que a **mensagem de erro aparece como chave i18n crua** (`auth.errors.emailAlreadyRegistered`) em vez da mensagem traduzida. Isso acontece no `HomeAuthModal.tsx` (modal de cadastro da Home).

### Causa raiz

`HomeAuthModal.tsx` linha 52:
```typescript
t: (key: string) => t(`auth.${key}`) || t(key)
```

O `useTranslation()` é chamado **sem namespace**, então `t('auth.errors.emailAlreadyRegistered')` busca a chave literal `auth.errors.emailAlreadyRegistered` no namespace default — que não existe. Deveria usar `useTranslation('auth')` e passar `t` diretamente, como já faz o `UserLoginArtes.tsx`.

### Correção

**`src/components/HomeAuthModal.tsx`**:
- Mudar `useTranslation()` → `useTranslation('auth')`  
- Mudar a linha do `t:` para: `t: (key: string) => t(key)`

Isso corrige a exibição de todas as mensagens de erro/sucesso no modal da Home.

