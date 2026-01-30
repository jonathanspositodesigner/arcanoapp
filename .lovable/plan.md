
# Plano: Adicionar Botões de Prompt por Categoria

## Resumo

Adicionar 5 botões de categorias de prompt (Pessoas, Comida, Foto Antiga, Logo, Render 3D) que ficam acima do toggle de "Prompt Personalizado". Cada botão tem um prompt específico que será enviado automaticamente.

## Layout Visual

```text
┌─────────────────────────────────────────────────────────────┐
│  💬 Tipo de Imagem                                          │
│                                                             │
│  ┌──────────┐ ┌─────────┐ ┌────────────┐ ┌──────┐ ┌───────┐│
│  │ Pessoas  │ │ Comida  │ │ Foto Antiga│ │ Logo │ │Render │ │
│  │(selected)│ │         │ │            │ │      │ │  3D   │ │
│  └──────────┘ └─────────┘ └────────────┘ └──────┘ └───────┘│
│                                                             │
│  ☐ Usar prompt personalizado                         [OFF] │
│                                                             │
│  (se ON: botões somem e textarea aparece)                  │
└─────────────────────────────────────────────────────────────┘
```

## Comportamento

1. **Padrão**: Botão "Pessoas" vem pré-selecionado
2. **Ao clicar num botão**: O prompt daquele botão será enviado (nenhum outro prompt)
3. **Ao ativar "Prompt Personalizado"**: Os 5 botões desaparecem, usuário usa seu próprio prompt
4. **Ao desativar "Prompt Personalizado"**: Botões voltam, "Pessoas" fica selecionado

## Prompts por Botão

| Botão | Prompt |
|-------|--------|
| **Pessoas** | "Enhance the photo while maintaining 100% of the original identity and lighting. Increase hyper-realism: natural and realistic skin texture, visible micro-pores, subtle microvilli/peach fuzz, hairs corrected strand by strand, defined eyebrows with natural hairs, sharper eyes with realistic reflections, defined eyelashes without exaggeration, lips with natural texture and lines, noise reduction preserving fine details, high yet clean sharpness, balanced contrast and skin tones, PBR detail enhancement (skin with subtle subsurface scattering), realistic depth of field and 4K/8K photographic finish." |
| **Comida** | "Realistic food photography: boost sharpness and micro-textures, enhance ingredient detail, natural highlights, true-to-life appetizing colors, soft studio lighting, clean professional finish." |
| **Foto Antiga** | "Realistic photo restoration: remove scratches/tears/stains, reduce blur, recover sharpness and fine details, fix faded colors, balanced contrast, preserve original texture and identity, natural look." |
| **Logo** | "Preserve exact colors, proportions, typography, spacing, outlines, and alignment. Restore clean, sharp edges; remove jaggies/blur/artifacts and noise while keeping the same visual identity." |
| **Render 3D** | "Premium 3D detailing: sharpen edges and emboss depth, add fine surface micro-textures (metal/plastic), realistic reflections and highlights, clean shadows, consistent depth, high-end render finish." |

---

## Detalhes Técnicos

**Arquivo:** `src/pages/UpscalerArcanoTool.tsx`

### 1. Adicionar constante com os prompts (após linha 27)

```tsx
const PROMPT_CATEGORIES = {
  pessoas: "Enhance the photo while maintaining 100% of the original identity and lighting. Increase hyper-realism: natural and realistic skin texture, visible micro-pores, subtle microvilli/peach fuzz, hairs corrected strand by strand, defined eyebrows with natural hairs, sharper eyes with realistic reflections, defined eyelashes without exaggeration, lips with natural texture and lines, noise reduction preserving fine details, high yet clean sharpness, balanced contrast and skin tones, PBR detail enhancement (skin with subtle subsurface scattering), realistic depth of field and 4K/8K photographic finish.",
  comida: "Realistic food photography: boost sharpness and micro-textures, enhance ingredient detail, natural highlights, true-to-life appetizing colors, soft studio lighting, clean professional finish.",
  fotoAntiga: "Realistic photo restoration: remove scratches/tears/stains, reduce blur, recover sharpness and fine details, fix faded colors, balanced contrast, preserve original texture and identity, natural look.",
  logo: "Preserve exact colors, proportions, typography, spacing, outlines, and alignment. Restore clean, sharp edges; remove jaggies/blur/artifacts and noise while keeping the same visual identity.",
  render3d: "Premium 3D detailing: sharpen edges and emboss depth, add fine surface micro-textures (metal/plastic), realistic reflections and highlights, clean shadows, consistent depth, high-end render finish."
} as const;

type PromptCategory = keyof typeof PROMPT_CATEGORIES;
```

### 2. Adicionar novo estado (após linha 38)

```tsx
const [promptCategory, setPromptCategory] = useState<PromptCategory>('pessoas');
```

### 3. Resetar para "pessoas" quando desativar prompt personalizado

Adicionar `useEffect` para quando `useCustomPrompt` mudar de `true` para `false`:

```tsx
useEffect(() => {
  if (!useCustomPrompt) {
    setPromptCategory('pessoas');
  }
}, [useCustomPrompt]);
```

### 4. Função para obter o prompt final

```tsx
const getFinalPrompt = (): string => {
  if (useCustomPrompt) {
    return customPrompt;
  }
  return PROMPT_CATEGORIES[promptCategory];
};
```

### 5. Atualizar lógica de envio (linhas 312 e 364)

**Antes:**
```tsx
prompt: useCustomPrompt ? customPrompt : null
```

**Depois:**
```tsx
prompt: getFinalPrompt()
```

Agora SEMPRE envia um prompt - ou o da categoria selecionada, ou o personalizado.

### 6. Adicionar UI dos botões de categoria (antes do Card do prompt personalizado, linha 962)

```tsx
{/* Image Type Category Buttons - only show when custom prompt is OFF */}
{!useCustomPrompt && (
  <Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-4">
    <div className="flex items-center gap-2 mb-3">
      <MessageSquare className="w-4 h-4 text-pink-400" />
      <span className="font-medium text-white">Tipo de Imagem</span>
    </div>
    <ToggleGroup 
      type="single" 
      value={promptCategory} 
      onValueChange={(value) => value && setPromptCategory(value as PromptCategory)}
      className="flex flex-wrap gap-2"
    >
      <ToggleGroupItem 
        value="pessoas" 
        className={`px-3 py-2 text-sm ${
          promptCategory === 'pessoas' 
            ? 'bg-purple-600 text-white border-2 border-purple-400' 
            : 'border-2 border-transparent text-purple-300/70 hover:bg-purple-500/10'
        }`}
      >
        Pessoas
      </ToggleGroupItem>
      <ToggleGroupItem 
        value="comida" 
        className={`px-3 py-2 text-sm ${
          promptCategory === 'comida' 
            ? 'bg-purple-600 text-white border-2 border-purple-400' 
            : 'border-2 border-transparent text-purple-300/70 hover:bg-purple-500/10'
        }`}
      >
        Comida
      </ToggleGroupItem>
      <ToggleGroupItem 
        value="fotoAntiga" 
        className={`px-3 py-2 text-sm ${
          promptCategory === 'fotoAntiga' 
            ? 'bg-purple-600 text-white border-2 border-purple-400' 
            : 'border-2 border-transparent text-purple-300/70 hover:bg-purple-500/10'
        }`}
      >
        Foto Antiga
      </ToggleGroupItem>
      <ToggleGroupItem 
        value="logo" 
        className={`px-3 py-2 text-sm ${
          promptCategory === 'logo' 
            ? 'bg-purple-600 text-white border-2 border-purple-400' 
            : 'border-2 border-transparent text-purple-300/70 hover:bg-purple-500/10'
        }`}
      >
        Logo
      </ToggleGroupItem>
      <ToggleGroupItem 
        value="render3d" 
        className={`px-3 py-2 text-sm ${
          promptCategory === 'render3d' 
            ? 'bg-purple-600 text-white border-2 border-purple-400' 
            : 'border-2 border-transparent text-purple-300/70 hover:bg-purple-500/10'
        }`}
      >
        Render 3D
      </ToggleGroupItem>
    </ToggleGroup>
  </Card>
)}
```

---

## Fluxo do Prompt

```text
┌─────────────────────────────────────────────────────┐
│              Usuário ativa "Processar"              │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │  useCustomPrompt = ON? │
            └────────────────────────┘
                   │           │
                  SIM         NÃO
                   │           │
                   ▼           ▼
        ┌──────────────┐  ┌────────────────────────┐
        │ customPrompt │  │ PROMPT_CATEGORIES[cat] │
        └──────────────┘  └────────────────────────┘
                   │           │
                   └─────┬─────┘
                         ▼
              ┌────────────────────┐
              │  Envia para API    │
              │  (apenas 1 prompt) │
              └────────────────────┘
```

## Resumo das Mudanças

1. Adicionar constante `PROMPT_CATEGORIES` com os 5 prompts
2. Adicionar estado `promptCategory` iniciando com `'pessoas'`
3. Adicionar `useEffect` para resetar para `'pessoas'` quando desativar prompt personalizado
4. Criar função `getFinalPrompt()` que retorna o prompt correto
5. Atualizar 2 lugares que enviam o prompt para usar `getFinalPrompt()`
6. Adicionar seção de botões de categoria (só aparece quando `!useCustomPrompt`)
7. Remover `DEFAULT_PROMPT` que não será mais usado
