
# Plano: Completar Implementação do Login em Dois Passos

## Problema Identificado

O arquivo `UserLogin.tsx` (página de login da Biblioteca de Prompts - `/login`) ainda está usando o fluxo antigo onde email e senha aparecem juntos. Precisa ser atualizado para o fluxo de dois passos.

## Status Atual

| Componente | Status |
|------------|--------|
| ✅ HomeAuthModal.tsx | Já implementado |
| ✅ UserLoginArtes.tsx | Já implementado |
| ✅ UserLoginArtesMusicos.tsx | Já implementado |
| ❌ **UserLogin.tsx** | Precisa atualizar |

## O Que Será Feito

### Atualizar UserLogin.tsx

Transformar o formulário de login para usar dois passos:

**Passo 1 (Email):**
- Campo de email apenas
- Botão "Continuar"
- Opção "Criar conta"

**Passo 2 (Senha) - após verificação:**
- Mostra email verificado com botão "Trocar"
- Campo de senha
- Link "Esqueci minha senha"
- Botão "Entrar"

### Novos Estados Necessários

```tsx
const [loginStep, setLoginStep] = useState<'email' | 'password'>('email');
const [verifiedEmail, setVerifiedEmail] = useState("");
const [isCheckingEmail, setIsCheckingEmail] = useState(false);
```

### Lógica de Verificação

1. Usuário insere email → clica Continuar
2. Sistema verifica com `check_profile_exists`:
   - Email não existe → abre modal de signup
   - Email existe, sem senha (`password_changed = false`) → auto-login e redireciona para `/change-password`
   - Email existe, com senha → mostra campo de senha

### UI do Passo 1

```tsx
{loginStep === 'email' && (
  <form onSubmit={handleEmailCheck}>
    <Input type="email" value={email} ... />
    <Button>{isCheckingEmail ? 'Verificando...' : 'Continuar'}</Button>
    <Button onClick={() => setShowSignupModal(true)}>Criar conta</Button>
  </form>
)}
```

### UI do Passo 2

```tsx
{loginStep === 'password' && (
  <form onSubmit={handlePasswordLogin}>
    <div className="email-indicator">
      {verifiedEmail} <Button onClick={handleChangeEmail}>Trocar</Button>
    </div>
    <Input type="password" value={password} ... />
    <Link to="/forgot-password">Esqueci minha senha</Link>
    <Button>Entrar</Button>
  </form>
)}
```

## Arquivo a Modificar

- `src/pages/UserLogin.tsx` - Refatorar para fluxo de dois passos

## Resultado Esperado

Todas as páginas de login da plataforma terão o mesmo fluxo consistente:
1. Digita email → Continuar
2. Sistema detecta status da conta
3. Mostra campo de senha ou redireciona apropriadamente
