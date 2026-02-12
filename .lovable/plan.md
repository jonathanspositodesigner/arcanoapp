

## Redesign: Sidebar + Header padronizado + Fonte Space Grotesk

### Resumo

Extrair o sidebar e header que ja existem na Biblioteca de Prompts para componentes reutilizaveis, e aplicar em todas as paginas da biblioteca e ferramentas de IA. Trocar a fonte global para Space Grotesk.

---

### Fase 1: Fonte Space Grotesk (global)

**Arquivos**: `index.html`, `src/index.css`

- Substituir `Poppins:wght@400;500;600;700;800` por `Space+Grotesk:wght@300;400;500;600;700`
- Atualizar `font-family` no CSS de `'Poppins'` para `'Space Grotesk'`
- Manter `Bebas Neue` que ja existe

---

### Fase 2: Extrair componentes reutilizaveis da BibliotecaPrompts

Criar 3 componentes novos que sao uma copia exata dos elementos que ja existem na BibliotecaPrompts:

#### `src/components/layout/AppSidebar.tsx`
Extrair o sidebar da BibliotecaPrompts (linhas 640-730) -- contendo os **mesmos botoes** que ja existem:
- Instalar App
- Premium Ativo / Seja Premium / Login
- **Gere com IA** (titulo)
- Ferramentas de IA (botao destacado)
- Gerar no ChatGPT
- Gerar no Nano Banana
- Gerar no Whisk
- Gerar no Flux 2
- Gerar Video no VEO 3
- Entrar no grupo do WhatsApp

Props: recebe `user`, `isPremium`, `sidebarOpen`, `setSidebarOpen` (para controle mobile).

#### `src/components/layout/AppTopBar.tsx`
Extrair os headers desktop e mobile da BibliotecaPrompts (linhas 485-625) -- contendo:
- Logo
- Home button
- Area do Parceiro
- Login / Premium / Badge Premium Ativo
- Creditos + botao comprar
- ProfileDropdown (perfil do usuario)

Props: recebe `user`, `isPremium`, `credits`, `creditsLoading`, `planType`.

#### `src/components/layout/AppLayout.tsx`
Wrapper que combina AppSidebar + AppTopBar + conteudo:

```text
+----------------------------------------------------------+
| [TopBar: logo | home | parceiro | premium | creditos]    |
+-------------------+--------------------------------------+
|                   |                                      |
|   SIDEBAR         |       {children}                     |
|   (mesmos botoes  |                                      |
|    da biblioteca) |                                      |
|                   |                                      |
+-------------------+--------------------------------------+
```

No mobile: sidebar vira drawer (mesmo comportamento atual da biblioteca).

---

### Fase 3: Aplicar nas paginas

Cada pagina abaixo sera envolvida pelo `AppLayout`, removendo o header/sidebar proprio que ja tem:

| Pagina | Arquivo | O que muda |
|--------|---------|------------|
| Biblioteca de Prompts | `BibliotecaPrompts.tsx` | Substituir sidebar e header inline pelo AppLayout |
| Ferramentas IA | `FerramentasIAAplicativo.tsx` | Remover ToolsHeader, usar AppLayout |
| Upscaler Arcano | `UpscalerArcanoTool.tsx` | Remover ToolsHeader, usar AppLayout |
| Arcano Cloner | `ArcanoClonerTool.tsx` | Remover ToolsHeader, usar AppLayout |
| Veste AI | `VesteAITool.tsx` | Remover ToolsHeader, usar AppLayout |
| Pose Changer | `PoseChangerTool.tsx` | Remover ToolsHeader, usar AppLayout |
| Gerador Personagem | `GeradorPersonagemTool.tsx` | Remover ToolsHeader, usar AppLayout |
| Video Upscaler | `VideoUpscalerTool.tsx` | Remover ToolsHeader, usar AppLayout |
| Forja Selos 3D | `ForjaSelos3D.tsx` | Remover ToolsHeader, usar AppLayout |
| Selecao de versao Upscaler | `UpscalerArcanoVersionSelect.tsx` | Remover ToolsHeader, usar AppLayout |
| Planos Creditos | `PlanosCreditos.tsx` | Remover ToolsHeader, usar AppLayout |
| Historico Creditos | `CreditHistory.tsx` | Usar AppLayout |
| Configuracoes Perfil | `ProfileSettings.tsx` | Usar AppLayout |
| Mudar Pose (aulas) | `MudarPose.tsx` | Remover ToolsHeader, usar AppLayout |
| Mudar Roupa (aulas) | `MudarRoupa.tsx` | Remover ToolsHeader, usar AppLayout |
| Aulas por versao | `ToolVersionLessons.tsx` | Remover ToolsHeader, usar AppLayout |

O `ToolsHeader` existente **nao sera deletado** (pode haver paginas de artes que o usem), mas todas essas paginas deixarao de usa-lo.

---

### Ordem de implementacao

Devido ao tamanho (16+ paginas), sera feito em **3 mensagens**:

1. **Mensagem 1**: Fonte Space Grotesk + criar AppSidebar, AppTopBar, AppLayout + aplicar na BibliotecaPrompts
2. **Mensagem 2**: Aplicar em FerramentasIAAplicativo, PlanosCreditos, CreditHistory, ProfileSettings, ForjaSelos3D, UpscalerArcanoVersionSelect, MudarPose, MudarRoupa, ToolVersionLessons
3. **Mensagem 3**: Aplicar nas ferramentas de IA (Upscaler, Cloner, Veste, Pose, Video, Gerador)

---

### Riscos e cuidados

- A troca de fonte e **global** -- afeta todas as paginas do site (landing pages, artes, musicos, etc). Isso foi solicitado pelo usuario.
- As ferramentas de IA (Upscaler, Cloner, etc) usam `h-screen overflow-hidden` para layout de tela cheia. O AppLayout precisara de um modo compacto para essas paginas.
- Os botoes da sidebar sao **exatamente os mesmos** que ja existem na Biblioteca de Prompts. Nenhum botao novo sera adicionado -- configuracao futura fica por conta do usuario.
