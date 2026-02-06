
# Plano: Padronizar Navegação de Retorno em Todo o Sistema

## Problema Identificado

Dezenas de botões "Voltar" (setas ← no menu superior e botões com texto) estão usando rotas fixas (hardcoded), fazendo o usuário perder o contexto de navegação. Por exemplo:

- Usuário está no **Upscaler Arcano** → acessa **Perfil** → clica "Voltar" → vai para `/biblioteca-prompts` em vez de voltar ao Upscaler
- Usuário está na **Biblioteca de Artes** → acessa **Créditos** → clica "Voltar" → vai para `/profile-settings` em vez da biblioteca

## Solução

Alterar todos os botões de voltar para usar `navigate(-1)` (voltar para página anterior do histórico do navegador).

---

## Arquivos a Modificar (Total: 22 arquivos identificados - Primeira Leva)

### Categoria 1: Perfil e Créditos (Alta Prioridade)

| Arquivo | Linha | Atual | Correção |
|---------|-------|-------|----------|
| `src/pages/CreditHistory.tsx` | 79 | `navigate("/profile-settings")` | `navigate(-1)` |
| `src/pages/ProfileSettings.tsx` | 198 | `navigate("/biblioteca-prompts")` | `navigate(-1)` |
| `src/pages/ProfileSettingsArtes.tsx` | 186 | `navigate(fromMusicos ? "..." : "...")` | `navigate(-1)` |

### Categoria 2: Páginas de Planos

| Arquivo | Linha | Atual | Correção |
|---------|-------|-------|----------|
| `src/pages/Planos.tsx` | 159 | `navigate('/biblioteca-prompts')` | `navigate(-1)` |
| `src/pages/Planos2.tsx` | 257 | `navigate('/biblioteca-prompts')` | `navigate(-1)` |
| `src/pages/PlanosArtes.tsx` | 348 | `navigate("/biblioteca-artes")` | `navigate(-1)` |
| `src/pages/PlanosArtesMusicos.tsx` | 133 | `navigate('/biblioteca-artes-musicos')` | `navigate(-1)` |
| `src/pages/PlanosArtesMembro.tsx` | 256 | `navigate("/biblioteca-artes")` | `navigate(-1)` |
| `src/pages/PlanosForjaSelos3D.tsx` | 98 | `navigate("/biblioteca-artes")` | `navigate(-1)` |
| `src/pages/UpgradePlano.tsx` | 207 | `navigate('/biblioteca-prompts')` | `navigate(-1)` |

### Categoria 3: Páginas de Login

| Arquivo | Linha(s) | Atual | Correção |
|---------|----------|-------|----------|
| `src/pages/UserLogin.tsx` | 83 | `navigate("/")` | `navigate(-1)` |
| `src/pages/UserLoginArtes.tsx` | 60 | `navigate("/")` | `navigate(-1)` |
| `src/pages/UserLoginArtesMusicos.tsx` | 60 | `navigate("/")` | `navigate(-1)` |
| `src/pages/ForgotPassword.tsx` | 51, 68 | `navigate("/login")` | `navigate(-1)` |
| `src/pages/ForgotPasswordArtes.tsx` | 59, 76 | `navigate("/login-artes")` | `navigate(-1)` |
| `src/pages/ForgotPasswordArtesMusicos.tsx` | 39, 50 | `navigate("/login-artes-musicos")` | `navigate(-1)` |

### Categoria 4: Tutoriais e Outras Páginas

| Arquivo | Linha | Atual | Correção |
|---------|-------|-------|----------|
| `src/pages/TutorialArtes.tsx` | 112 | `navigate("/biblioteca-artes")` | `navigate(-1)` |
| `src/pages/BibliotecaArtesHub.tsx` | 79 | `navigate("/")` | `navigate(-1)` |

---

## Arquivos Restantes (Admin e Parceiros - Segunda Leva)

Preciso também ler e corrigir os seguintes arquivos do painel administrativo e parceiros:

- `src/pages/PartnerDashboard.tsx`
- `src/pages/PartnerDashboardArtes.tsx`
- `src/pages/PartnerDashboardMusicos.tsx`
- `src/pages/PartnerUpload.tsx`
- `src/pages/PartnerUploadArtes.tsx`
- `src/pages/PartnerUploadMusicos.tsx`
- `src/pages/PartnerLogin.tsx`
- `src/pages/PartnerLoginArtes.tsx`
- `src/pages/PartnerLoginUnified.tsx`
- `src/pages/AdminUpload.tsx` e variantes
- `src/pages/AdminPartners.tsx` e variantes
- `src/pages/AdminManage*.tsx` (vários)
- `src/pages/InstallApp.tsx`
- `src/pages/PromosNatal.tsx`
- `src/pages/AguardandoPagamentoMusicos.tsx`

---

## Padrão de Código

### Antes (Errado)
```tsx
<Button onClick={() => navigate("/biblioteca-prompts")}>
  <ArrowLeft className="mr-2 h-4 w-4" />
  Voltar
</Button>
```

### Depois (Correto)
```tsx
<Button onClick={() => navigate(-1)}>
  <ArrowLeft className="mr-2 h-4 w-4" />
  Voltar
</Button>
```

---

## Resultado Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Upscaler → Perfil → Voltar | Ia para `/biblioteca-prompts` | Volta ao Upscaler |
| Biblioteca Artes → Créditos → Voltar | Ia para `/profile-settings` | Volta à Biblioteca Artes |
| Pose Changer → Planos → Voltar | Ia para `/biblioteca-prompts` | Volta ao Pose Changer |
| Qualquer página → Login → Voltar | Ia para `/` | Volta à página anterior |

---

## O que NÃO será alterado

- Edge Functions (nenhuma)
- Lógica de autenticação
- Fluxo de redirecionamento após login (usa parâmetro `?redirect=`)
- Componentes de ferramentas de IA (já usam `useSmartBackNavigation`)
