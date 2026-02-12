
# Modal de Free Trial Global para Ferramentas de IA

## Resumo
Transformar o modal de free trial (atualmente exclusivo do Arcano Cloner) em um componente global que aparece em todas as ferramentas de IA, com um novo passo inicial pedindo criacao de conta na RunningHub antes do login/cadastro.

## Novo Fluxo do Modal

```text
+----------------------------------+
| Passo 1: RunningHub (NOVO)       |
| "Ganhe 300 creditos gratis!"     |
| [Criar conta no RunningHub]      |
|          |                       |
|    (countdown 15s)               |
|          |                       |
| [Ja criei minha conta]           |
+----------------------------------+
            |
            v
+----------------------------------+
| Passo 2: Email (existente)       |
| "Faca login ou crie sua conta"   |
| [Campo de email + Continuar]     |
+----------------------------------+
            |
            v
+----------------------------------+
| Passo 3: Senha/Cadastro/Verify   |
| (fluxo atual do AuthModal)       |
+----------------------------------+
```

## Mudancas

### 1. Renomear e Generalizar o ArcanoClonerAuthModal
- Renomear para `AIToolsAuthModal` (ou manter o arquivo e criar um wrapper)
- Adicionar novo step `'runninghub'` como passo inicial (antes de `'email'`)
- O step `'runninghub'` tera:
  - Icone animado + titulo "Ganhe 300 creditos gratis!"
  - Beneficios listados (conta gratuita, creditos, etc.)
  - Botao "Criar conta no RunningHub" que abre o link de referral
  - Countdown de 15 segundos apos clicar
  - Botao "Ja criei minha conta" apos countdown (avanca para step `'email'`)
  - Botao "Agora nao" para fechar
- Tipo de step atualizado: `'runninghub' | 'email' | 'password' | 'signup' | 'verify-email'`

### 2. Controle de Visibilidade (sessionStorage)
- Usar uma chave `ai_tools_free_trial_modal_shown` no sessionStorage para nao mostrar repetidamente na mesma sessao
- O modal aparece automaticamente apos ~2 segundos se:
  - Usuario NAO esta logado (`!user`)
  - Modal ainda nao foi exibido na sessao atual

### 3. Integrar em Todas as Ferramentas de IA
Adicionar o modal nas seguintes paginas (mesmo padrao do Arcano Cloner):
- `UpscalerArcanoTool.tsx`
- `VideoUpscalerTool.tsx`
- `VesteAITool.tsx`
- `PoseChangerTool.tsx`
- `GeradorPersonagemTool.tsx`
- `ForjaSelos3D.tsx`

Em cada pagina:
- Importar `AIToolsAuthModal`
- Adicionar state `showAuthModal`
- Adicionar useEffect para mostrar modal apos 2s se `!user`
- Adicionar handler `handleAuthSuccess` que fecha o modal e chama `claim-arcano-free-trial`
- Renderizar `<AIToolsAuthModal />` no JSX

### 4. Atualizar o ArcanoClonerTool.tsx
- Trocar o import do `ArcanoClonerAuthModal` pelo novo `AIToolsAuthModal`
- Remover a condicao `cameFromLibrary` - agora aparece sempre que `!user`
- Manter o handler `handleAuthSuccess` existente

## Detalhes Tecnicos

### Novo componente: `src/components/ai-tools/AIToolsAuthModal.tsx`
- Baseado no `ArcanoClonerAuthModal` existente
- Step inicial `'runninghub'` reutiliza a logica visual do `RunningHubBonusModal` (countdown, link referral, etc.)
- Props: `isOpen`, `onClose`, `onAuthSuccess`
- Constantes: `RUNNINGHUB_REFERRAL_URL`, `COUNTDOWN_SECONDS = 15`

### Logica de exibicao por pagina (hook ou inline)
Cada pagina de ferramenta adicionara:
```text
const [showAuthModal, setShowAuthModal] = useState(false);

useEffect - se !user e !sessionStorage tem chave, mostra apos 2s
handleAuthSuccess - fecha modal + chama claim-arcano-free-trial + refetchCredits
```

### Arquivos modificados
1. **Novo**: `src/components/ai-tools/AIToolsAuthModal.tsx`
2. **Modificado**: `src/pages/ArcanoClonerTool.tsx` - trocar para novo modal
3. **Modificado**: `src/pages/UpscalerArcanoTool.tsx` - adicionar modal
4. **Modificado**: `src/pages/VideoUpscalerTool.tsx` - adicionar modal
5. **Modificado**: `src/pages/VesteAITool.tsx` - adicionar modal
6. **Modificado**: `src/pages/PoseChangerTool.tsx` - adicionar modal
7. **Modificado**: `src/pages/GeradorPersonagemTool.tsx` - adicionar modal
8. **Modificado**: `src/pages/ForjaSelos3D.tsx` - adicionar modal
