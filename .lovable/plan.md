
# Plano: Reorganizar Layout do Upscaler Arcano

## Objetivo
Mudar o layout do Upscaler Arcano para o mesmo esquema do Pose Changer:
- **Painel esquerdo (~28%)**: Upload de imagem + todas as configurações + botão de gerar
- **Painel direito (~72%)**: Visualizador do resultado (antes/depois ou preview)

---

## Layout Proposto (Desktop)

```text
┌──────────────────────────────────────────────────────────────────────┐
│                            HEADER                                     │
├─────────────────────┬────────────────────────────────────────────────┤
│  CONTROLES (~28%)   │            RESULTADO (~72%)                     │
│                     │                                                 │
│ ┌─────────────────┐ │  ┌───────────────────────────────────────────┐ │
│ │ Version Toggle  │ │  │                                           │ │
│ │ Standard | PRO  │ │  │                                           │ │
│ └─────────────────┘ │  │        VISOR GRANDE                       │ │
│                     │  │        (antes/depois ou preview)          │ │
│ ┌─────────────────┐ │  │                                           │ │
│ │ Upload Imagem   │ │  │                                           │ │
│ │ (compacto h-20) │ │  │                                           │ │
│ └─────────────────┘ │  │                                           │ │
│                     │  └───────────────────────────────────────────┘ │
│ ┌─────────────────┐ │                                                 │
│ │ Tipo de Imagem  │ │                                                 │
│ │ (se !PRO ou se  │ │                                                 │
│ │  !customPrompt) │ │                                                 │
│ └─────────────────┘ │                                                 │
│                     │                                                 │
│ ┌─────────────────┐ │                                                 │
│ │ Nível Detalhe   │ │                                                 │
│ │ (só PRO)        │ │                                                 │
│ └─────────────────┘ │                                                 │
│                     │                                                 │
│ ┌─────────────────┐ │                                                 │
│ │ Resolução 2K/4K │ │                                                 │
│ └─────────────────┘ │                                                 │
│                     │                                                 │
│ ┌─────────────────┐ │                                                 │
│ │ Custom Prompt   │ │                                                 │
│ │ (só PRO)        │ │                                                 │
│ └─────────────────┘ │                                                 │
│                     │                                                 │
│ [GERAR - 60/80 cr] │                                                 │
└─────────────────────┴────────────────────────────────────────────────┘
```

---

## Alterações Principais

### 1. Estrutura Principal (linha ~628-635)

**Antes:**
```tsx
<div className="max-w-4xl mx-auto px-4 py-6 pb-28 sm:pb-6 space-y-6">
  {/* Componentes empilhados verticalmente */}
</div>
```

**Depois:**
```tsx
<div className="h-screen overflow-hidden flex flex-col">
  <ToolsHeader ... />
  <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-2 overflow-hidden">
    <div className="grid grid-cols-1 lg:grid-cols-7 gap-3 h-full">
      {/* Esquerda: col-span-2 */}
      {/* Direita: col-span-5 */}
    </div>
  </div>
</div>
```

### 2. Painel Esquerdo (Controles)

Todos os elementos atuais reorganizados verticalmente:
1. **Version Switcher** (Standard/PRO) - compactado
2. **Upload de Imagem** - área menor (h-20)
3. **Tipo de Imagem** - botões menores
4. **Nível de Detalhe** (slider) - só para PRO
5. **Resolução** - 2K/4K
6. **Custom Prompt** - só para PRO
7. **Botão Gerar** - na parte inferior

### 3. Painel Direito (Resultado)

Exibe:
- **Estado idle sem imagem**: Placeholder vazio ou dica
- **Estado idle com imagem**: Preview da imagem carregada
- **Estado processing**: Loading overlay
- **Estado completed**: Slider Before/After com zoom
- **Estado error**: Mensagem de erro

---

## Compactação dos Componentes

| Componente | Antes | Depois |
|------------|-------|--------|
| Version Toggle | `py-3` | `py-2 text-sm` |
| Upload Area | `p-12` | `p-4 h-20` |
| Cards de config | `p-4` | `p-3` |
| Botão Gerar | `py-6 text-lg` | `py-3 text-sm` |
| Gaps entre cards | `space-y-4` | `gap-2` |

---

## Arquivo a Modificar

**`src/pages/UpscalerArcanoTool.tsx`**

Reestruturação completa do return JSX mantendo toda a lógica existente.

---

## Comportamento por Versão

### Standard (Básico)
- Version Toggle
- Upload
- Tipo de Imagem (Pessoas, Comida, etc.)
- Resolução 2K/4K
- Botão Gerar (60 créditos)

### PRO
- Tudo do Standard +
- Nível de Detalhe (slider)
- Custom Prompt (toggle + textarea)
- Botão Gerar (80 créditos)

---

## Mobile (Layout Vertical)

No mobile (`lg:` breakpoint), mantém layout vertical:
- Controles em cima
- Resultado embaixo
- Botão fixo no bottom (já existente)
