

# Plano: Tooltips de Tempo e Custo de Créditos

## O que vou fazer

1. **Adicionar tooltips com tempo de espera** nos botões do switcher Standard/PRO
2. **Mostrar custo de créditos no botão "Aumentar Qualidade"** baseado na versão selecionada

---

## Mudanças no Arquivo

### `src/pages/UpscalerArcanoTool.tsx`

#### 1. Importar componente Tooltip e ícone Coins
```typescript
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
// Adicionar Coins ao import do lucide-react
import { ..., Coins } from 'lucide-react';
```

#### 2. Envolver o ToggleGroup com TooltipProvider e adicionar tooltips

**Botão Standard (linhas 550-555):**
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <ToggleGroupItem 
      value="standard" 
      className="..."
    >
      Upscaler Arcano
    </ToggleGroupItem>
  </TooltipTrigger>
  <TooltipContent className="bg-black/90 border-purple-500/30">
    <div className="flex items-center gap-1.5 text-sm">
      <Clock className="w-3.5 h-3.5 text-purple-400" />
      <span>~2m 20s</span>
    </div>
  </TooltipContent>
</Tooltip>
```

**Botão PRO (linhas 556-565):**
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <ToggleGroupItem 
      value="pro" 
      className="..."
    >
      Upscaler Arcano
      <span className="...">
        <Crown className="w-3 h-3" />
        PRO
      </span>
    </ToggleGroupItem>
  </TooltipTrigger>
  <TooltipContent className="bg-black/90 border-purple-500/30">
    <div className="flex items-center gap-1.5 text-sm">
      <Clock className="w-3.5 h-3.5 text-purple-400" />
      <span>~3m 30s</span>
    </div>
  </TooltipContent>
</Tooltip>
```

#### 3. Atualizar botão "Aumentar Qualidade" com custo de créditos (linhas 958-964)

```tsx
<Button
  className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25"
  onClick={processImage}
>
  <Sparkles className="w-5 h-5 mr-2" />
  {t('upscalerTool.buttons.increaseQuality')}
  <span className="ml-2 flex items-center gap-1 text-sm opacity-90">
    <Coins className="w-4 h-4" />
    {version === 'pro' ? '60' : '40'}
  </span>
</Button>
```

---

## Resultado Visual

**Switcher:**
- Ao passar o mouse no "Upscaler Arcano" (Standard): tooltip com `🕐 ~2m 20s`
- Ao passar o mouse no "Upscaler Arcano PRO": tooltip com `🕐 ~3m 30s`

**Botão de Ação:**
- Standard selecionado: `✨ Aumentar Qualidade 🪙 40`
- PRO selecionado: `✨ Aumentar Qualidade 🪙 60`

