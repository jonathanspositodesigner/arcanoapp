
# Plano: Remover Lógica Duplicada de Primeiro Acesso

## Problema Identificado

Após a centralização do `useUnifiedAuth`, ainda existem **3 arquivos críticos** que mantêm lógica duplicada de autenticação (`handleFirstAccessCheck`) com modais próprios de "Primeiro Acesso":

1. **`src/pages/BibliotecaArtes.tsx`** (~60 linhas de lógica duplicada)
2. **`src/pages/FerramentasIA.tsx`** (~70 linhas de lógica duplicada)
3. **`src/pages/FerramentasIAES.tsx`** (~70 linhas de lógica duplicada)

Essas páginas têm botões "Já é cliente? Primeiro acesso aqui!" que abrem modais com a mesma lógica que agora está centralizada no hook.

## Solução

Refatorar essas páginas para **redirecionar diretamente para a página de login** (`/login-artes` ou `/login-artes?redirect=...`) em vez de implementar modais próprios, já que as páginas de login agora usam o `useUnifiedAuth` com o fluxo correto.

### Alternativamente (opção 2):
Usar o hook `useUnifiedAuth` diretamente nessas páginas com modais, removendo a função `handleFirstAccessCheck` duplicada.

---

## Arquivos que Serão Alterados

### 1. `src/pages/BibliotecaArtes.tsx`

**Remover:**
- Estados: `showFirstAccessModal`, `firstAccessEmail`, `firstAccessLoading`, `showEmailNotFoundModal`
- Função: `handleFirstAccessCheck` (linhas 188-260)
- Modais: "First Access Modal" e "Email Not Found Modal" (linhas 1657-1724)

**Modificar:**
- Botão mobile "Já é cliente?" → navegar diretamente para `/login-artes?redirect=/biblioteca-artes`
- Botão no header → navegar diretamente para `/login-artes?redirect=/biblioteca-artes`

**Código após refatoração (botão mobile):**
```tsx
{!user && (
  <div className="md:hidden px-4 pt-4">
    <Button 
      onClick={() => navigate('/login-artes?redirect=/biblioteca-artes')} 
      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white animate-pulse"
    >
      <UserCheck className="h-4 w-4 mr-2" />
      Já é cliente? Primeiro acesso aqui!
    </Button>
  </div>
)}
```

---

### 2. `src/pages/FerramentasIA.tsx`

**Remover:**
- Estados: `showFirstAccessModal`, `firstAccessEmail`, `firstAccessLoading`, `showEmailNotFoundModal`
- Função: `handleFirstAccessCheck` (linhas 110-178)
- Modais: "First Access Modal" e "Email Not Found Modal" (linhas 383-475)

**Modificar:**
- Botão "Primeiro acesso" → navegar diretamente para `/login-artes?redirect=/ferramentas-ia`

**Código após refatoração:**
```tsx
{!user && (
  <div className="bg-[#1A0A2E] border-b border-purple-500/20">
    <div className="container mx-auto px-4 py-3">
      <Button
        onClick={() => navigate('/login-artes?redirect=/ferramentas-ia')}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
        size="sm"
      >
        <UserCheck className="w-4 h-4 mr-2" />
        {t('ferramentas.firstAccess')}
      </Button>
    </div>
  </div>
)}
```

---

### 3. `src/pages/FerramentasIAES.tsx`

**Remover:**
- Estados: `showFirstAccessModal`, `firstAccessEmail`, `firstAccessLoading`, `showEmailNotFoundModal`
- Função: `handleFirstAccessCheck` (linhas 65-133)
- Modais: "First Access Modal" e "Email Not Found Modal" (linhas 324-420)

**Modificar:**
- Botões "Primeiro Acesso" e "Login" → navegar diretamente para `/login-artes?redirect=/ferramentas-ia-es`

**Código após refatoração:**
```tsx
{!user && (
  <div className="bg-[#1A0A2E] border-b border-purple-500/20">
    <div className="container mx-auto px-4 py-3">
      <div className="flex gap-2">
        <Button
          onClick={() => navigate('/login-artes?redirect=/ferramentas-ia-es')}
          className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
          size="sm"
        >
          <UserCheck className="w-4 h-4 mr-2" />
          {t('ferramentas.firstAccess')}
        </Button>
        <Button
          onClick={() => navigate('/login-artes?redirect=/ferramentas-ia-es')}
          variant="outline"
          className="flex-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
          size="sm"
        >
          <LogIn className="w-4 h-4 mr-2" />
          Login
        </Button>
      </div>
    </div>
  </div>
)}
```

---

## Páginas que JÁ ESTÃO CORRETAS

Estas páginas apenas navegam para as páginas de login (que usam o hook centralizado), então **não precisam de alteração**:

| Arquivo | Destino | Status |
|---------|---------|--------|
| `BibliotecaPrompts.tsx` | `/login` | ✅ OK |
| `BibliotecaArtesMusicos.tsx` | `/login-artes-musicos` | ✅ OK |
| `Planos.tsx` / `Planos2.tsx` | `/login` | ✅ OK |
| `PlanosArtes.tsx` | `/login-artes` | ✅ OK |
| `Promptverso.tsx` | Sem login direto | ✅ OK |

---

## Benefícios da Refatoração

1. **Eliminação de código duplicado** (~200 linhas removidas)
2. **Consistência do fluxo** - todos os acessos passam pelo hook centralizado
3. **Manutenção simplificada** - uma única fonte de verdade
4. **Menos estados para gerenciar** nas páginas de biblioteca/ferramentas

---

## Resumo das Alterações

| Arquivo | Linhas Removidas | Alteração |
|---------|------------------|-----------|
| `BibliotecaArtes.tsx` | ~100+ linhas | Remover `handleFirstAccessCheck` + modais |
| `FerramentasIA.tsx` | ~100+ linhas | Remover `handleFirstAccessCheck` + modais |
| `FerramentasIAES.tsx` | ~100+ linhas | Remover `handleFirstAccessCheck` + modais |

**Total: ~300 linhas de código duplicado removidas**

---

## Testes Necessários

1. **BibliotecaArtes**: Clicar em "Já é cliente? Primeiro acesso" → deve ir para `/login-artes?redirect=/biblioteca-artes`
2. **FerramentasIA**: Clicar em "Primeiro Acesso" → deve ir para `/login-artes?redirect=/ferramentas-ia`
3. **FerramentasIAES**: Clicar em "Primeiro Acesso" ou "Login" → deve ir para `/login-artes?redirect=/ferramentas-ia-es`
4. Em cada caso, o fluxo de primeiro acesso deve funcionar corretamente na página de login (email verificado → auto-login ou link → cadastro de senha)
