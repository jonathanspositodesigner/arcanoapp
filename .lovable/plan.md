

# Plano: Padronizar Todos os Botões "Voltar" com navigate(-1)

## Objetivo

Atualizar **TODOS** os botões de voltar do site para usar `navigate(-1)` diretamente, garantindo que o usuário sempre volte para a página anterior do histórico do navegador.

---

## Arquivos a Modificar

### Grupo 1: Páginas de Ferramentas e Seleção

| Arquivo | Atual | Novo |
|---------|-------|------|
| `src/pages/UpscalerSelectionPage.tsx:20` | `navigate("/ferramentas-ia-aplicativo")` | `navigate(-1)` |
| `src/pages/PlanosCreditos.tsx:124` | Já usa `navigate(-1)` | ✅ Sem mudança |

### Grupo 2: Páginas de Login e Auth

| Arquivo | Atual | Novo |
|---------|-------|------|
| `src/pages/UserLogin.tsx:93` | `navigate("/")` | `navigate(-1)` |
| `src/pages/UserLoginArtes.tsx:60` | `navigate("/")` | `navigate(-1)` |
| `src/pages/UserLoginArtesMusicos.tsx:60` | `navigate("/")` | `navigate(-1)` |
| `src/pages/ForgotPassword.tsx:68` | `navigate("/login")` | `navigate(-1)` |
| `src/pages/ForgotPasswordArtes.tsx:76` | `navigate("/login-artes")` | `navigate(-1)` |
| `src/pages/AdminLogin.tsx:216` | `navigate("/")` | `navigate(-1)` |
| `src/pages/PartnerLogin.tsx:58` | `navigate("/")` | `navigate(-1)` |
| `src/pages/PartnerLoginUnified.tsx:147` | `navigate("/")` | `navigate(-1)` |

### Grupo 3: Páginas de Configurações e Perfil

| Arquivo | Atual | Novo |
|---------|-------|------|
| `src/pages/ProfileSettings.tsx:198` | `navigate("/biblioteca-prompts")` | `navigate(-1)` |

### Grupo 4: Páginas Utilitárias

| Arquivo | Atual | Novo |
|---------|-------|------|
| `src/pages/InstallApp.tsx:57` | `navigate("/")` | `navigate(-1)` |
| `src/pages/ContributePrompts.tsx:226` | `navigate("/")` | `navigate(-1)` |
| `src/pages/AdminUpload.tsx:407` | `navigate("/")` | `navigate(-1)` |

### Grupo 5: Páginas de Biblioteca

| Arquivo | Atual | Novo |
|---------|-------|------|
| `src/pages/BibliotecaArtesHub.tsx:79` | `navigate("/")` | `navigate(-1)` |

### Grupo 6: Páginas de Planos (link "já comprei")

| Arquivo | Atual | Novo |
|---------|-------|------|
| `src/pages/PlanosArtes.tsx:575` | `navigate("/login-artes")` | Manter (é link para login, não voltar) |

---

## Mudanças por Arquivo

### 1. `src/pages/UpscalerSelectionPage.tsx`

```text
// Antes (linha 20)
onBack={() => navigate("/ferramentas-ia-aplicativo")}

// Depois
onBack={() => navigate(-1)}
```

### 2. `src/pages/UserLogin.tsx`

```text
// Antes (linha 93)
onClick={() => navigate("/")}

// Depois
onClick={() => navigate(-1)}
```

### 3. `src/pages/UserLoginArtes.tsx`

```text
// Antes (linha 60)
onClick={() => navigate("/")}

// Depois
onClick={() => navigate(-1)}
```

### 4. `src/pages/UserLoginArtesMusicos.tsx`

```text
// Antes (linha 60)
onClick={() => navigate("/")}

// Depois
onClick={() => navigate(-1)}
```

### 5. `src/pages/ForgotPassword.tsx`

```text
// Antes (linha 68)
onClick={() => navigate("/login")}

// Depois
onClick={() => navigate(-1)}
```

### 6. `src/pages/ForgotPasswordArtes.tsx`

```text
// Antes (linha 76)
onClick={() => navigate("/login-artes")}

// Depois
onClick={() => navigate(-1)}
```

### 7. `src/pages/AdminLogin.tsx`

```text
// Antes (linha 216)
onClick={() => navigate("/")}

// Depois
onClick={() => navigate(-1)}
```

### 8. `src/pages/PartnerLogin.tsx`

```text
// Antes (linha 58)
onClick={() => navigate("/")}

// Depois
onClick={() => navigate(-1)}
```

### 9. `src/pages/PartnerLoginUnified.tsx`

```text
// Antes (linha 147)
onClick={() => navigate("/")}

// Depois
onClick={() => navigate(-1)}
```

### 10. `src/pages/ProfileSettings.tsx`

```text
// Antes (linha 198)
onClick={() => navigate("/biblioteca-prompts")}

// Depois
onClick={() => navigate(-1)}
```

### 11. `src/pages/InstallApp.tsx`

```text
// Antes (linha 57)
onClick={() => navigate("/")}

// Depois
onClick={() => navigate(-1)}
```

### 12. `src/pages/ContributePrompts.tsx`

```text
// Antes (linha 226)
onClick={() => navigate("/")}

// Depois
onClick={() => navigate(-1)}
```

### 13. `src/pages/AdminUpload.tsx`

```text
// Antes (linha 407)
onClick={() => navigate("/")}

// Depois
onClick={() => navigate(-1)}
```

### 14. `src/pages/BibliotecaArtesHub.tsx`

```text
// Antes (linha 79)
onClick={() => navigate("/")}

// Depois
onClick={() => navigate(-1)}
```

---

## Resumo

| Total de Arquivos | 14 |
|-------------------|-----|
| Páginas de Auth | 8 |
| Páginas de Ferramentas | 1 |
| Páginas de Perfil | 1 |
| Páginas Utilitárias | 3 |
| Páginas de Biblioteca | 1 |

---

## Resultado Esperado

Após esta mudança, **todos** os botões "Voltar" do site vão:

1. Voltar para a página anterior do histórico do navegador
2. Funcionar corretamente independente de como o usuário chegou na página
3. Comportamento consistente em todo o site

---

## Arquivos que NÃO serão modificados

- `src/pages/PlanosArtes.tsx:575` - Este é um link "Já comprou um pack?" que leva para login, não é um botão de voltar
- `src/pages/AdminLogin.tsx:279` - O `handleBackToLogin` interno da página (volta para step anterior, não navegação)
- Páginas que já usam `useSmartBackNavigation` (UpscalerArcanoTool, VesteAITool, etc.) - já funcionam corretamente

