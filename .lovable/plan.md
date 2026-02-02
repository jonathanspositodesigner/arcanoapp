
# Plano: Pose Changer Tool - Nova Ferramenta de IA

## Visão Geral

Criar uma nova página `/pose-changer-tool` baseada no layout e arquitetura do `UpscalerArcanoTool`, mas com funcionalidade específica para troca de poses usando dois inputs de imagem: a foto da pessoa e a referência de pose.

---

## Layout da Interface

O layout será responsivo, adaptando-se para desktop e mobile:

### Desktop (2 colunas principais)

```text
┌────────────────────────────────────────────────────────────────────┐
│                         HEADER (ToolsHeader)                        │
├───────────────────────────────┬────────────────────────────────────┤
│    LADO ESQUERDO (40%)        │      LADO DIREITO (60%)            │
│                               │                                     │
│  ┌─────────────────────────┐  │   ┌─────────────────────────────┐  │
│  │ FOTO DA PESSOA          │  │   │                             │  │
│  │ (Upload area)           │  │   │                             │  │
│  │ [imagem carregada]      │  │   │    RESULTADO                │  │
│  └─────────────────────────┘  │   │    (visor grande)           │  │
│                               │   │                             │  │
│  ┌─────────────────────────┐  │   │                             │  │
│  │ REFERÊNCIA DE POSE      │  │   │                             │  │
│  │ (Upload area)           │  │   └─────────────────────────────┘  │
│  │ [imagem carregada]      │  │                                     │
│  │                         │  │                                     │
│  │ [Biblioteca de Poses]   │  │                                     │
│  └─────────────────────────┘  │                                     │
│                               │                                     │
│  [BOTÃO GERAR POSE]           │                                     │
│  60 créditos                  │                                     │
└───────────────────────────────┴────────────────────────────────────┘
```

### Mobile (Layout vertical)

```text
┌─────────────────────────────────────┐
│         HEADER (ToolsHeader)         │
├─────────────────────────────────────┤
│  FOTO DA PESSOA (upload)             │
├─────────────────────────────────────┤
│  REFERÊNCIA DE POSE (upload)         │
│  [Biblioteca de Poses]               │
├─────────────────────────────────────┤
│  RESULTADO (preview grande)          │
├─────────────────────────────────────┤
│  [BOTÃO GERAR POSE]                  │
└─────────────────────────────────────┘
```

---

## Modal: Biblioteca de Referências

Quando o usuário clicar em "Biblioteca de Poses", abre um modal com:

```text
┌──────────────────────────────────────────────────────────────┐
│  BIBLIOTECA DE POSES DE REFERÊNCIA                      [X]  │
├──────────────────────────────────────────────────────────────┤
│  [HOMEM]  [MULHER]                                           │
├──────────────────────────────────────────────────────────────┤
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐                     │
│  │ 👤 │  │ 👤 │  │ 👤 │  │ 👤 │  │ 👤 │                     │
│  └────┘  └────┘  └────┘  └────┘  └────┘                     │
│                                                              │
│  (grid 3x4 ou 4x3 com poses pré-configuradas)               │
└──────────────────────────────────────────────────────────────┘
```

**Filtros:**
- HOMEM: Poses masculinas (ex: em pé, sentado, braços cruzados, etc.)
- MULHER: Poses femininas

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/PoseChangerTool.tsx` | Página principal da ferramenta |
| `src/components/pose-changer/PoseLibraryModal.tsx` | Modal da biblioteca de poses |
| `src/components/pose-changer/ImageUploadCard.tsx` | Card de upload reutilizável |

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Adicionar rota `/pose-changer-tool` |
| `src/locales/pt/tools.json` | Adicionar traduções da ferramenta |

---

## Componentes do Layout

### 1. ImageUploadCard (reutilizável)

Componente para upload de imagem com:
- Área de drag-and-drop
- Preview da imagem carregada
- Botão para remover/trocar imagem
- Suporte a colar do clipboard
- Título configurável

### 2. PoseLibraryModal

Modal para biblioteca de poses:
- Filtro por gênero (Homem/Mulher)
- Grid de imagens placeholder (configuráveis depois)
- Seleção ao clicar na pose
- Fecha e preenche automaticamente o input de referência

### 3. PoseChangerTool (página principal)

Layout baseado no UpscalerArcanoTool mas adaptado:
- Usa mesmo tema dark purple (#0D0221 / #1A0A2E)
- Mesmo sistema de créditos (useUpscalerCredits)
- Mesmo ToolsHeader
- Mesmo sistema de autenticação

---

## Estados da Página

```tsx
// Inputs
const [personImage, setPersonImage] = useState<string | null>(null);
const [referenceImage, setReferenceImage] = useState<string | null>(null);
const [showPoseLibrary, setShowPoseLibrary] = useState(false);

// Processamento
const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
const [outputImage, setOutputImage] = useState<string | null>(null);

// Biblioteca
const [poseFilter, setPoseFilter] = useState<'homem' | 'mulher'>('homem');
```

---

## Imagens Placeholder para Biblioteca

Por enquanto, usar imagens fictícias (placeholder) com cores sólidas e ícones para indicar onde ficarão as poses reais:

**Homem (6-8 poses):**
- Em pé casual
- Braços cruzados
- Sentado
- Caminhando
- Apontando
- etc.

**Mulher (6-8 poses):**
- Em pé elegante
- Mãos na cintura
- Sentada
- Pose fashion
- etc.

---

## Fluxo do Usuário

1. Usuário acessa `/pose-changer-tool`
2. Faz upload da foto da pessoa (ou arrasta/cola)
3. Faz upload da pose de referência OU clica em "Biblioteca de Poses"
   - Se clicar na biblioteca: abre modal, seleciona filtro, escolhe pose
4. Com ambas imagens carregadas, botão "Gerar Nova Pose" fica ativo
5. Clica no botão (consome créditos)
6. Aguarda processamento (skeleton/loading)
7. Resultado aparece no visor grande à direita
8. Pode baixar ou resetar

---

## Custo de Créditos

Inicialmente definir como **60 créditos** (igual ao Upscaler Standard), ajustável depois quando o motor for conectado.

---

## Estrutura do Código

### PoseChangerTool.tsx (estrutura base)

```tsx
const PoseChangerTool = () => {
  // Estados
  // Hooks (usePremiumStatus, useUpscalerCredits, useSmartBackNavigation)
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D0221] via-[#1A0A2E] to-[#16082A]">
      <ToolsHeader title="Pose Changer" onBack={goBack} />
      
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          
          {/* Lado Esquerdo - 2/5 */}
          <div className="md:col-span-2 space-y-4">
            <ImageUploadCard 
              title="Sua Foto" 
              image={personImage}
              onImageChange={setPersonImage}
            />
            <ImageUploadCard 
              title="Referência de Pose"
              image={referenceImage}
              onImageChange={setReferenceImage}
              showLibraryButton
              onOpenLibrary={() => setShowPoseLibrary(true)}
            />
            {/* Botão de Ação */}
          </div>
          
          {/* Lado Direito - 3/5 */}
          <div className="md:col-span-3">
            {/* Visor do Resultado */}
          </div>
        </div>
      </div>
      
      <PoseLibraryModal 
        isOpen={showPoseLibrary}
        onClose={() => setShowPoseLibrary(false)}
        onSelectPose={(url) => setReferenceImage(url)}
      />
    </div>
  );
};
```

---

## Próximos Passos (Fase 2 - Motor IA)

Após o layout estar pronto, você vai fornecer a documentação do motor Running Hub para:
1. Criar edge function de processamento
2. Configurar WebApp ID e nodeIds específicos
3. Integrar com sistema de jobs e realtime
4. Conectar webhook de conclusão

---

## Resumo das Funcionalidades

- Upload de foto da pessoa (drag, click, paste)
- Upload de referência de pose (drag, click, paste, ou biblioteca)
- Modal de biblioteca com filtros Homem/Mulher
- Visor grande para resultado à direita
- Sistema de créditos integrado
- Layout responsivo mobile/desktop
- Mesmo tema visual do Upscaler Arcano
