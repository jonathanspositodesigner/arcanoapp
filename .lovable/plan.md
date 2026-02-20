

## Corrigir custo do Refinamento para 30 creditos

### Problema
O refinamento chama a edge function `generate-image` com `model: 'pro'`, que cobra o custo de "gerar_imagem_pro" (60 para unlimited, 100 para outros). Deveria cobrar **30 creditos fixos** para todos.

### Solucao

**1. Edge function `supabase/functions/generate-image/index.ts`**

Adicionar suporte a um parametro `source` no body da requisicao. Quando `source === 'arcano_cloner_refine'`:
- Custo fixo de 30 creditos (ignora tabela `ai_tool_settings` e plano do usuario)
- Descricao da transacao: `"Refinamento Arcano Cloner"` (em vez de "Gerar Imagem NanoBanana Pro")
- O job salvo em `image_generator_jobs` tera `user_credit_cost: 30`

Trecho afetado (linhas ~107-143):
- Apos extrair `source` do body, verificar se `source === 'arcano_cloner_refine'`
- Se sim: `creditCost = 30`, `toolDescription = 'Refinamento Arcano Cloner'`
- Se nao: logica atual inalterada (NanoBanana normal/pro)

**2. Frontend `src/pages/ArcanoClonerTool.tsx`**

Na funcao `handleRefine` (linha ~636), adicionar `source: 'arcano_cloner_refine'` ao body enviado para a edge function:

```typescript
const { data, error } = await supabase.functions.invoke('generate-image', {
  body: {
    prompt: refinePrompt.trim(),
    model: 'pro',
    aspect_ratio: aspectRatio,
    reference_images: referenceImages,
    source: 'arcano_cloner_refine',  // NOVO
  },
});
```

### O que NAO muda
- A geracao normal de imagem (NanoBanana) continua funcionando exatamente igual
- O modelo usado continua sendo `gemini-3-pro-image-preview` (qualidade maxima)
- O salvamento em "Minhas Criacoes" continua automatico
- A verificacao de saldo no frontend (30 creditos) ja esta correta

### Resumo das mudancas
- `supabase/functions/generate-image/index.ts`: aceitar campo `source`, se for `arcano_cloner_refine` cobrar 30 fixo
- `src/pages/ArcanoClonerTool.tsx`: enviar `source: 'arcano_cloner_refine'` no body

