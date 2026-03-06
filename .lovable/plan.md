

# Reduzir custo de geração de vídeo para 750 créditos

## Problema
O custo atual para usuários não-Unlimited é **1500 créditos**, hardcoded tanto no frontend quanto no backend. Precisa ser **750**.

## Alterações

### 1. Frontend — `src/pages/GerarVideoTool.tsx` (linha 61)
Trocar o fallback de `1500` para `750`:
```typescript
// De:
const creditCost = hasReducedCost ? getCreditCost('gerar_video', 700) : 1500;
// Para:
const creditCost = hasReducedCost ? getCreditCost('gerar_video', 700) : 750;
```

### 2. Backend — `supabase/functions/generate-video/index.ts` (linha 80)
Trocar o custo hardcoded de `1500` para `750`:
```typescript
// De:
creditCost = 1500;
// Para:
creditCost = 750;
```

Duas linhas, uma no front e uma no back. O custo para planos com desconto (Unlimited) continua lendo da tabela `ai_tool_settings`.

