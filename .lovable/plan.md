

# Plano: Padronizar Navegação de Retorno em Todo o Sistema

## Problema Identificado

Dezenas de botões "Voltar" (setas ← no menu superior e botões com texto) estão usando rotas fixas (hardcoded), fazendo o usuário perder o contexto de navegação. Por exemplo:

- Usuário está no **Upscaler Arcano** → acessa **Perfil** → clica "Voltar" → vai para `/biblioteca-prompts` em vez de voltar ao Upscaler
- Usuário está na **Biblioteca de Artes** → acessa **Créditos** → clica "Voltar" → vai para `/profile-settings` em vez da biblioteca

## Solução

Alterar todos os botões de voltar para usar `navigate(-1)` (voltar para página anterior do histórico do navegador).

---

## Arquivos a Modificar (Total: 52 arquivos)

### Categoria 1: Perfil e Créditos (Alta Prioridade)

| Arquivo | Linha | Atual | Correção |
|---------|-------|-------|----------|
| `src/pages/CreditHistory.tsx` | 79 | `navigate("/profile-settings")` | `navigate(-1)` |
| `src/pages/ProfileSettings.tsx` | 198 | `navigate("/biblioteca-prompts")` | `navigate(-1)` |
| `src/pages/ProfileSettingsArtes.tsx` | 186 | `navigate("/biblioteca-artes")` | `navigate(-1)` |

### Categoria 2: Páginas de Planos

| Arquivo | Linha | Atual | Correção |
|---------|-------|-------|----------|
| `src/pages/Planos.tsx` | 159 | `navigate('/biblioteca-prompts')` | `navigate(-1)` |
| `src/pages/Planos2.tsx` | ~257 | `navigate('/biblioteca-prompts')` | `navigate(-1)` |
| `src/pages/PlanosArtes.tsx` | ~348 | `navigate("/biblioteca-artes")` | `navigate(-1)` |
| `src/pages/PlanosArtesMusicos.tsx` | ~133 | `navigate('/biblioteca-artes-musicos')` | `navigate(-1)` |
| `src/pages/PlanosArtesMembro.tsx` | - | Rota fixa | `navigate(-1)` |
| `src/pages/PlanosForjaSelos3D.tsx` | - | Rota fixa | `navigate(-1)` |
| `src/pages/UpgradePlano.tsx` | 207 | `navigate('/biblioteca-prompts')` | `navigate(-1)` |

### Categoria 3: Páginas de Login

| Arquivo | Linha | Atual | Correção |
|---------|-------|-------|----------|
| `src/pages/UserLogin.tsx` | 83 | `navigate("/")` | `navigate(-1)` |
| `src/pages/UserLoginArtes.tsx` | ~60 | `navigate("/")` | `navigate(-1)` |
| `src/pages/UserLoginArtesMusicos.tsx` | ~60 | `navigate("/")` | `navigate(-1)` |
| `src/pages/ForgotPassword.tsx` | 51, 68 | `navigate("/login")` | `navigate(-1)` |
| `src/pages/ForgotPasswordArtes.tsx` | 59, 76 | `navigate("/login-artes")` | `navigate(-1)` |
| `src/pages/ForgotPasswordArtesMusicos.tsx` | ~50 | Rota fixa | `navigate(-1)` |
| `src/pages/PartnerLogin.tsx` | - | Rota fixa | `navigate(-1)` |
| `src/pages/PartnerLoginArtes.tsx` | - | Rota fixa | `navigate(-1)` |
| `src/pages/PartnerLoginUnified.tsx` | - | Rota fixa | `navigate(-1)` |

### Categoria 4: Tutoriais e Outras Páginas

| Arquivo | Linha | Atual | Correção |
|---------|-------|-------|----------|
| `src/pages/TutorialArtes.tsx` | 112 | `navigate("/biblioteca-artes")` | `navigate(-1)` |
| `src/pages/BibliotecaArtesHub.tsx` | 79 | `navigate("/")` | `navigate(-1)` |
| `src/pages/InstallApp.tsx` | - | Rota fixa | `navigate(-1)` |
| `src/pages/PromosNatal.tsx` | - | Rota fixa | `navigate(-1)` |
| `src/pages/AguardandoPagamentoMusicos.tsx` | - | Rota fixa | `navigate(-1)` |

### Categoria 5: Área de Parceiros

| Arquivo | Linha | Atual | Correção |
|---------|-------|-------|----------|
| `src/pages/PartnerDashboard.tsx` | 273 | `navigate('/parceiro-plataformas')` | `navigate(-1)` |
| `src/pages/PartnerDashboardArtes.tsx` | - | Rota fixa | `navigate(-1)` |
| `src/pages/PartnerDashboardMusicos.tsx` | - | Rota fixa | `navigate(-1)` |
| `src/pages/PartnerUpload.tsx` | 325 | `navigate("/parceiro-dashboard")` | `navigate(-1)` |
| `src/pages/PartnerUploadArtes.tsx` | 282 | `navigate("/parceiro-dashboard-artes")` | `navigate(-1)` |
| `src/pages/PartnerUploadMusicos.tsx` | 213 | `navigate("/parceiro-dashboard-musicos")` | `navigate(-1)` |

### Categoria 6: Painel Administrativo

| Arquivo | Atual | Correção |
|---------|-------|----------|
| `src/pages/AdminUpload.tsx` | `navigate("/admin")` | `navigate(-1)` |
| `src/pages/AdminUploadArtes.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminUploadArtesMusicos.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminPartners.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminPartnersArtes.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminPremiumDashboard.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminPremiumMusicos.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminManagePartners.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminManagePremium.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminManagePromotions.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminPackPurchases.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminManageBanners.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminManageBlacklist.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminManageImages.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminManagePacks.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminManageAdmins.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminManageArtes.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminManageArtesMusicos.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminInstallStats.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminLeads.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminLogin.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminCategoriesPrompts.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminCollections.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminCommunityReview.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminArtesReview.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminCategoriesArtes.tsx` | Rota fixa | `navigate(-1)` |
| `src/pages/AdminCategoriesMusicos.tsx` | Rota fixa | `navigate(-1)` |

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

