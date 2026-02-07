

# Plano: Remover Rotas Antigas de Ferramentas de IA e Unificar para a Nova Página

## Resumo

Remover completamente todas as rotas que levam para as páginas antigas (`/ferramentas-ia` e `/ferramentas-ia-es`) e redirecionar automaticamente todos os usuários para a nova página `/ferramentas-ia-aplicativo`.

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/App.tsx` | MODIFICAR | Substituir rotas antigas por redirects automáticos |
| `src/pages/Index.tsx` | MODIFICAR | Atualizar rota do card "Ferramentas de IA" |
| `src/pages/BibliotecaArtes.tsx` | MODIFICAR | Atualizar navegação do sidebar e botão |
| `src/pages/BibliotecaPrompts.tsx` | MODIFICAR | Atualizar link "Já comprou?" |
| `src/pages/FerramentaIAArtes.tsx` | MODIFICAR | Atualizar `toolsHomePath` para nova rota |
| `src/pages/UpscalerArcanoVersionSelect.tsx` | MODIFICAR | Atualizar `toolsHomePath` para nova rota |
| `src/pages/UpscalerArcanoV1.tsx` | MODIFICAR | Redirect para nova página |
| `src/pages/UpscalerArcanoV2.tsx` | MODIFICAR | Redirect para nova página |
| `src/pages/ForjaSelos3D.tsx` | MODIFICAR | Redirect para nova página |
| `src/pages/ForjaSelos3DArtes.tsx` | MODIFICAR | Redirect para nova página |
| `src/pages/MudarRoupa.tsx` | MODIFICAR | Redirect para nova página |
| `src/pages/MudarPose.tsx` | MODIFICAR | Redirect para nova página |
| `src/pages/PlanosUpscalerArcano69ES.tsx` | MODIFICAR | Atualizar navegação |
| `src/pages/PlanosUpscalerArcano590ES.tsx` | MODIFICAR | Atualizar navegação |
| `supabase/functions/webhook-hotmart-artes/index.ts` | MODIFICAR | Atualizar URL do e-mail |
| `supabase/functions/resend-pending-emails/index.ts` | MODIFICAR | Atualizar URL |
| `supabase/functions/webhook-greenn-creditos/index.ts` | MODIFICAR | Atualizar URL |

---

## Detalhes Técnicos

### 1. App.tsx - Rotas

**Antes:**
```tsx
<Route path="/ferramentas-ia" element={<FerramentasIA />} />
<Route path="/ferramentas-ia-es" element={<FerramentasIAES />} />
```

**Depois:**
```tsx
{/* Redirects automáticos das páginas antigas para a nova */}
<Route path="/ferramentas-ia" element={<Navigate to="/ferramentas-ia-aplicativo" replace />} />
<Route path="/ferramentas-ia-es" element={<Navigate to="/ferramentas-ia-aplicativo" replace />} />
```

Também remover os imports de `FerramentasIA` e `FerramentasIAES`.

---

### 2. Index.tsx - Card Principal

**Antes:**
```tsx
route: "/ferramentas-ia",
```

**Depois:**
```tsx
route: "/ferramentas-ia-aplicativo",
```

---

### 3. BibliotecaArtes.tsx - Sidebar e Botão

**Antes (linha ~486):**
```tsx
navigate('/ferramentas-ia?from=artes');
```

**Depois:**
```tsx
navigate('/ferramentas-ia-aplicativo?from=artes');
```

**Antes (linha ~762):**
```tsx
onClick={() => navigate('/ferramentas-ia?from=artes')}
```

**Depois:**
```tsx
onClick={() => navigate('/ferramentas-ia-aplicativo?from=artes')}
```

---

### 4. BibliotecaPrompts.tsx - Link "Já Comprou"

**Antes:**
```tsx
onClick={() => navigate("/ferramentas-ia")}
```

**Depois:**
```tsx
onClick={() => navigate("/ferramentas-ia-aplicativo")}
```

---

### 5. FerramentaIAArtes.tsx - toolsHomePath

**Antes:**
```tsx
const toolsHomePath = locale === 'es' ? '/ferramentas-ia-es' : '/ferramentas-ia';
```

**Depois:**
```tsx
const toolsHomePath = '/ferramentas-ia-aplicativo';
```

---

### 6. UpscalerArcanoVersionSelect.tsx - toolsHomePath

**Antes:**
```tsx
const toolsHomePath = locale === 'es' ? '/ferramentas-ia-es' : '/ferramentas-ia';
```

**Depois:**
```tsx
const toolsHomePath = '/ferramentas-ia-aplicativo';
```

---

### 7. Páginas de Ferramentas (Redirects de Acesso)

**UpscalerArcanoV1.tsx, UpscalerArcanoV2.tsx, ForjaSelos3D.tsx, MudarRoupa.tsx, MudarPose.tsx, ForjaSelos3DArtes.tsx:**

Todos os redirects de acesso negado vão mudar de:
```tsx
navigate("/ferramentas-ia");
```

Para:
```tsx
navigate("/ferramentas-ia-aplicativo");
```

---

### 8. Páginas de Planos ES

**PlanosUpscalerArcano69ES.tsx e PlanosUpscalerArcano590ES.tsx:**

**Antes:**
```tsx
onClick={() => navigate("/ferramentas-ia-es")}
```

**Depois:**
```tsx
onClick={() => navigate("/ferramentas-ia-aplicativo")}
```

---

### 9. Edge Functions - URLs de E-mail

**webhook-hotmart-artes/index.ts:**
```typescript
// Antes
const platformUrl = 'https://arcanoapp.voxvisual.com.br/ferramentas-ia-es'
// Depois
const platformUrl = 'https://arcanoapp.voxvisual.com.br/ferramentas-ia-aplicativo'
```

**resend-pending-emails/index.ts:**
```typescript
// Antes
'ferramentas_ia': 'https://arcanoapp.voxvisual.com.br/ferramentas-ia-es',
// Depois
'ferramentas_ia': 'https://arcanoapp.voxvisual.com.br/ferramentas-ia-aplicativo',
```

**webhook-greenn-creditos/index.ts:**
```typescript
// Antes
const platformUrl = 'https://arcanoapp.voxvisual.com.br/ferramentas-ia'
// Depois
const platformUrl = 'https://arcanoapp.voxvisual.com.br/ferramentas-ia-aplicativo'
```

---

## Fluxo de Redirecionamento

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TODOS OS CAMINHOS LEVAM À NOVA PÁGINA                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  /ferramentas-ia ──────────────┐                                           │
│                                 │                                           │
│  /ferramentas-ia-es ───────────┼───► /ferramentas-ia-aplicativo            │
│                                 │                                           │
│  Card na Index ────────────────┘                                           │
│  Sidebar Biblioteca Artes ─────────► /ferramentas-ia-aplicativo            │
│  Link Biblioteca Prompts ──────────► /ferramentas-ia-aplicativo            │
│  E-mails de boas-vindas ───────────► /ferramentas-ia-aplicativo            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## O Que NÃO Será Deletado

- Os arquivos `FerramentasIA.tsx` e `FerramentasIAES.tsx` podem ser mantidos no codebase por segurança, mas não serão mais acessíveis (as rotas redirecionam)
- Se preferir limpar o código, esses arquivos podem ser deletados após confirmar que tudo funciona

---

## Garantias

| Item | Status |
|------|--------|
| Usuários PT | Redirecionados para nova página |
| Usuários ES | Redirecionados para nova página |
| Usuários Ilimitados | Veem nova página como todos |
| Links antigos | Redirecionam automaticamente |
| E-mails | Apontam para nova página |
| Edge Functions | Atualizadas com nova URL |
| Banco de dados | Nenhuma alteração |

