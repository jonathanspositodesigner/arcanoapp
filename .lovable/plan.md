
# Plano: Redesign da Biblioteca de Prompts com Tema do Upscaler

## Resumo

Aplicar o mesmo esquema de cores roxo escuro (estilo Upscaler Arcano) em todas as paginas da Biblioteca de Prompts, incluindo:
1. Adicionar botao de perfil com dropdown e badge de creditos no header (igual ao Upscaler)
2. Redesenhar todas as paginas relacionadas com o tema escuro/roxo consistente
3. Manter hierarquia visual, contraste e tipografia padronizada

## Paginas Afetadas

| Pagina | Arquivo |
|--------|---------|
| Biblioteca de Prompts | `src/pages/BibliotecaPrompts.tsx` |
| Contribuir | `src/pages/ContributePrompts.tsx` |
| Login do Usuario | `src/pages/UserLogin.tsx` |
| Planos | `src/pages/Planos.tsx` |
| Alterar Senha | `src/pages/ChangePassword.tsx` |
| Esqueci Senha | `src/pages/ForgotPassword.tsx` |
| Configuracoes de Perfil | `src/pages/ProfileSettings.tsx` |
| Promptverso (Home) | `src/pages/Promptverso.tsx` |

---

## Novo Esquema de Cores

### Paleta Base (Estilo Upscaler)
```text
Background Principal:   #0D0221 (roxo muito escuro)
Background Secundario:  #1A0A2E (roxo escuro)
Card/Container:         #1A0A2E com bordas purple-500/20
Bordas:                 purple-500/20 ou purple-500/30
Texto Principal:        white
Texto Secundario:       purple-200, purple-300
Texto Terciario:        purple-400
Accent/Highlight:       purple-500, purple-600
Gradiente Primario:     from-purple-400 to-pink-400
Badge de Creditos:      bg-purple-900/50 border-purple-500/30
```

### Classes Tailwind Padronizadas
```text
Pagina:         min-h-screen bg-[#0D0221]
Header:         bg-[#0D0221]/80 backdrop-blur-lg border-b border-purple-500/20
Card:           bg-[#1A0A2E] border border-purple-500/20
Texto H1:       text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent
Botao Primario: bg-purple-600 hover:bg-purple-700 text-white
Botao Ghost:    text-purple-300 hover:text-white hover:bg-purple-500/20
Input:          bg-[#1A0A2E] border-purple-500/30 text-white placeholder:text-purple-400
```

---

## Etapa 1: Criar Componente Reutilizavel de Header com Creditos

**Novo arquivo:** `src/components/PromptsHeader.tsx`

Este componente sera reutilizado em todas as paginas da plataforma Prompts para garantir consistencia.

```text
Estrutura do Header:
+-----------------------------------------------------------------+
| [<- Voltar]  [Logo/Titulo]        [Badge Creditos] [Avatar ▼]   |
+-----------------------------------------------------------------+
```

### Funcionalidades do Header:
- Logo PromptClub clicavel (volta para home)
- Badge de creditos com icone de moeda (usando `useUpscalerCredits`)
- Dropdown de perfil com:
  - Nome do usuario e email
  - Telefone (se cadastrado)
  - Creditos restantes
  - Links: Alterar Senha, Configuracoes
  - Botao de Logout
- Estados diferentes para:
  - Usuario nao logado (mostra login/premium)
  - Usuario logado nao-premium (mostra upgrade)
  - Usuario premium (mostra badge + dropdown)

---

## Etapa 2: Redesenhar BibliotecaPrompts.tsx

### 2.1 Background e Estrutura Principal
```tsx
// DE:
<div className="min-h-screen bg-background">

// PARA:
<div className="min-h-screen bg-[#0D0221]">
```

### 2.2 Header Desktop
```tsx
// Novo header com tema escuro
<header className="hidden lg:flex bg-[#0D0221]/80 backdrop-blur-lg border-b border-purple-500/20 px-6 py-3 items-center justify-between sticky top-0 z-50">
  <div className="flex items-center gap-4">
    <img src={promptclubLogo} className="h-8 cursor-pointer" />
  </div>
  <div className="flex items-center gap-3">
    {/* Badge de Creditos */}
    <Badge className="bg-purple-900/50 border-purple-500/30 text-purple-200 flex items-center gap-1.5">
      <Coins className="w-3.5 h-3.5 text-yellow-400" />
      {credits}
    </Badge>
    
    {/* Dropdown de Perfil */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-purple-300 hover:text-white hover:bg-purple-500/20 rounded-full">
          <User className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-[#1A0A2E] border-purple-500/30 text-white">
        {/* ... menu items ... */}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</header>
```

### 2.3 Header Mobile
```tsx
<header className="lg:hidden bg-[#0D0221]/95 backdrop-blur-lg px-4 py-3 flex items-center justify-between shadow-lg border-b border-purple-500/20 sticky top-0 z-50">
  <img src={promptclubLogo} className="h-6" />
  <div className="flex items-center gap-2">
    {/* Badge Creditos compacto */}
    <Badge className="bg-purple-900/50 border-purple-500/30 text-purple-200 text-xs px-2 py-0.5">
      <Coins className="w-3 h-3 text-yellow-400 mr-1" />
      {credits}
    </Badge>
    {/* Icone Perfil */}
    <DropdownMenu>
      {/* ... */}
    </DropdownMenu>
  </div>
</header>
```

### 2.4 Sidebar
```tsx
<aside className="... bg-[#1A0A2E] border-r border-purple-500/20 ...">
  {/* Titulos */}
  <h2 className="text-xl font-bold text-white mb-6">Gerar com IA</h2>
  
  {/* Botoes */}
  <Button variant="outline" className="border-purple-500/30 text-purple-200 hover:bg-purple-500/20 hover:text-white">
    ...
  </Button>
</aside>
```

### 2.5 Area Principal de Conteudo
```tsx
<main className="flex-1 p-4 sm:p-6 lg:p-8 bg-[#0D0221] ...">
  {/* Titulos */}
  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-white">
    Biblioteca de Prompts
  </h2>
  <p className="text-purple-300/80">Descricao...</p>
  
  {/* Cards */}
  <Card className="bg-[#1A0A2E] border-purple-500/20 hover:border-purple-400/40 ...">
    <h3 className="text-white font-bold">Titulo</h3>
    <p className="text-purple-300">Descricao</p>
  </Card>
</main>
```

### 2.6 Filtros de Categoria
```tsx
<Button 
  className={selectedCategory === cat 
    ? "bg-purple-600 text-white border-purple-400" 
    : "border-purple-500/30 text-purple-300/70 hover:bg-purple-500/10"
  }
>
  {cat}
</Button>
```

---

## Etapa 3: Redesenhar ContributePrompts.tsx

### Mudancas:
- Background: `bg-[#0D0221]`
- Card container: `bg-[#1A0A2E] border-purple-500/20`
- Inputs: `bg-[#0D0221] border-purple-500/30 text-white`
- Labels: `text-purple-200`
- Botao de enviar: `bg-purple-600 hover:bg-purple-700`

---

## Etapa 4: Redesenhar UserLogin.tsx

### Mudancas:
- Background: `bg-[#0D0221]` com gradiente sutil
- Card: `bg-[#1A0A2E] border-purple-500/20`
- Icone Star: Manter amarelo para destaque premium
- Inputs: Tema escuro com bordas roxas
- Botao login: `bg-gradient-to-r from-purple-500 to-pink-500`
- Links: `text-purple-400 hover:text-purple-300`

---

## Etapa 5: Redesenhar Planos.tsx

### Mudancas:
- Background: `bg-[#0D0221]`
- Cards de planos: `bg-[#1A0A2E] border-purple-500/20`
- Card destacado (popular): `border-2 border-purple-500`
- Tabs de billing: Tema roxo
- Badges de promocao: Manter cores distintas (laranja, verde)
- Check icons: `text-purple-400`
- Precos: `text-white`

---

## Etapa 6: Redesenhar ChangePassword.tsx

### Mudancas:
- Background: `bg-[#0D0221]`
- Card: `bg-[#1A0A2E] border-purple-500/20`
- Icone Lock: `text-purple-400`
- Inputs: Tema escuro
- Botao: `bg-gradient-to-r from-purple-500 to-pink-500`

---

## Etapa 7: Redesenhar ProfileSettings.tsx

### Mudancas:
- Background: `bg-[#0D0221]`
- Cards de secao: `bg-[#1A0A2E] border-purple-500/20`
- Titulos: `text-white`
- Labels: `text-purple-200`
- Inputs: Tema escuro
- Avatar placeholder: `bg-purple-900/50`
- Botao de voltar: `text-purple-300 hover:text-white`

---

## Etapa 8: Redesenhar Promptverso.tsx (Home)

### Mudancas:
- Background: `bg-gradient-to-br from-[#0D0221] to-[#1A0A2E]`
- Titulo com gradiente: `from-purple-400 to-pink-400`
- Botoes principais: `bg-purple-600 hover:bg-purple-700`
- Botoes secundarios: `border-purple-500 text-purple-300`
- Texto: `text-white` e `text-purple-300`

---

## Etapa 9: Atualizar ForgotPassword.tsx e ResetPassword.tsx

Aplicar mesmo padrao de cores escuras consistente.

---

## Resumo Visual

```text
ANTES (Tema Claro)              APOS (Tema Escuro/Roxo)
+------------------------+      +------------------------+
| bg-background (branco) |  ->  | bg-[#0D0221] (escuro)  |
| bg-card (branco)       |  ->  | bg-[#1A0A2E] (roxo)    |
| text-foreground        |  ->  | text-white             |
| text-muted-foreground  |  ->  | text-purple-300        |
| border-border          |  ->  | border-purple-500/20   |
| bg-primary             |  ->  | bg-purple-600          |
+------------------------+      +------------------------+
```

---

## Arquivos a Serem Modificados

| Arquivo | Tipo de Mudanca |
|---------|-----------------|
| `src/pages/BibliotecaPrompts.tsx` | Redesign completo + header com creditos |
| `src/pages/ContributePrompts.tsx` | Redesign de cores |
| `src/pages/UserLogin.tsx` | Redesign de cores |
| `src/pages/Planos.tsx` | Redesign de cores |
| `src/pages/ChangePassword.tsx` | Redesign de cores |
| `src/pages/ForgotPassword.tsx` | Redesign de cores |
| `src/pages/ProfileSettings.tsx` | Redesign de cores + adicionar secao de creditos |
| `src/pages/Promptverso.tsx` | Redesign de cores |

---

## Imports Necessarios em BibliotecaPrompts.tsx

```tsx
// Novos imports
import { User, Settings, Lock, LogOut, Phone, Coins } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUpscalerCredits } from '@/hooks/useUpscalerCredits';
```

---

## Observacoes Importantes

1. **Consistencia**: Todas as paginas terao o mesmo visual dark/purple do Upscaler
2. **Creditos**: O badge de creditos usara o mesmo hook `useUpscalerCredits` ja criado
3. **Responsividade**: Manter todos os breakpoints mobile/desktop existentes
4. **Internacionalizacao**: Manter todos os textos usando `t()` do i18next
5. **Acessibilidade**: Garantir contraste adequado (texto claro em fundo escuro)
6. **Hierarquia**: 
   - H1: Branco com gradiente purple/pink
   - H2: Branco solido
   - Texto: purple-200/300
   - Muted: purple-400
