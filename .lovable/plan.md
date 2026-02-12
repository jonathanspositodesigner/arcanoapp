

# Adicionar botao "Criar Conta" e fluxo de signup no modal da Home

## O que sera feito

1. **Botao "Criar Conta"** adicionado abaixo dos steps de login (email e password), antes do link "Navegar sem login", com o mesmo visual da imagem de referencia (texto "Ainda nao tem conta?" + botao outline "Criar Conta" com icone)

2. **Step de signup** dentro do modal usando o componente `SignupForm` ja existente, com variant `default`, mostrando campos de email, nome, senha e confirmar senha

3. **Tela de sucesso pos-cadastro** - ao clicar em "Criar Conta" no formulario, o modal NAO fecha. Em vez disso, exibe a tela de sucesso que ja existe no componente (com icone de check, mensagem pedindo para ir ao email confirmar a conta, mencionando para conferir o spam, e botao "Voltar ao Login")

4. **Link de confirmacao** levara para a home (`/`) com o usuario ja logado, usando o mesmo fluxo de confirmacao de email do restante do site (SendPulse)

## Detalhes Tecnicos

### Arquivo: `src/components/HomeAuthModal.tsx`

**Alteracoes:**

1. Importar `SignupForm` do `@/components/auth`
2. No bloco de login (steps `email` e `password`), adicionar antes do "Navegar sem login":
   - Texto "Ainda nao tem conta?"
   - Botao outline "Criar Conta" com icone `UserPlus`, chamando `auth.goToSignup()`
3. Adicionar condicional para `auth.state.step === 'signup'`:
   - Renderizar `SignupForm` com `defaultEmail={auth.state.email}`, `onSubmit={auth.signup}`, `onBackToLogin={auth.goToLogin}`, variant `default`
   - Sem header grande (o header do modal ja tem titulo)
4. Atualizar labels do `LoginEmailStep` para mostrar o botao de criar conta:
   - Remover `noAccountYet: ''` e `createAccount: ''`
   - Ou melhor: manter o botao separado fora do LoginEmailStep para controle visual

### Fluxo:
```text
[Modal abre] -> [Email step] -> [Clica "Criar Conta"]
  -> [SignupForm aparece] -> [Preenche dados] -> [Clica "Criar Conta"]
  -> [Modal permanece aberto, mostra tela de sucesso com mensagem de confirmacao]
  -> [Usuario vai ao email, clica no link] -> [Redirecionado para / logado]
```

### Tela de sucesso (ja existe no componente):
- Icone de check verde
- Titulo: "Conta criada com sucesso!"
- Mensagem: "Enviamos um email de confirmacao para:"
- Email do usuario em destaque
- Instrucao: "Clique no link do email para ativar sua conta"
- Aviso: "Confira tambem sua caixa de spam"
- Botao: "Voltar ao Login"

O `onSignupSuccess` callback do `useUnifiedAuth` ja esta configurado para setar `signupSuccess = true` e mostrar esta tela, entao nao precisa de logica adicional. O modal nao fecha porque o callback nao chama `onClose`.

