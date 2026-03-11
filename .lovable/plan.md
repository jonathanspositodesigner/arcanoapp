

## Plano: Botão "Criar conta grátis" com modal direto + desativado para logados

### Problemas
1. Botão "Criar conta grátis" redireciona para `/login` em vez de abrir modal de cadastro direto
2. Botão aparece ativo mesmo para usuários já logados (deveria estar desativado)

### Solução

**Arquivo: `src/pages/Planos2.tsx`**

1. **Botão desativado para logados**: Se `userId` existe (usuário logado), o botão Free fica `disabled` com texto "Conta já criada" ou similar

2. **Modal de cadastro para deslogados**: Importar e reutilizar o `HomeAuthModal` (mesmo componente da Home, com fluxo completo de 3 passos + tela de sucesso com aviso de verificar email/spam)

3. **Lógica do botão Free**:
   - Se logado → botão disabled, texto "Você já tem uma conta"
   - Se deslogado → `setShowSignupModal(true)` → abre `HomeAuthModal`

4. **Adicionar estado** `showSignupModal` e renderizar `<HomeAuthModal>` no JSX

O `HomeAuthModal` já tem tudo pronto: cadastro em 3 passos (email/dados pessoais/endereço), confirmação de email com aviso de spam, e fluxo de login caso a pessoa já tenha conta.

