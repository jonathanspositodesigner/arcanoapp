

# Adicionar Nano Banana 2 ao Gerar Imagem

## Pesquisa confirmada

**Nano Banana 2** é o modelo `gemini-3.1-flash-image-preview` do Google. Ele usa exatamente a mesma API REST que os modelos atuais (`generativelanguage.googleapis.com/v1beta/models/`), com `responseModalities: ["IMAGE", "TEXT"]`. Gera imagens em 4K, leva 4-6 segundos.

- Nano Banana (atual) = `gemini-2.5-flash-image`
- Nano Banana Pro (atual) = `gemini-3-pro-image-preview`  
- **Nano Banana 2 (novo)** = `gemini-3.1-flash-image-preview`

## Mudanças

### 1. Edge Function — `supabase/functions/generate-image/index.ts`
- Adicionar o modelo: `const nano2GeminiModel = "gemini-3.1-flash-image-preview";`
- Quando `model === "nano2"`, usar esse modelo na chamada `callGeminiWithRetry` (mesma API REST do Google, mesma estrutura)
- Custo: buscar de `ai_tool_settings` com key `gerar_imagem_nano2`, fallback 100
- Descrição do job: `"Gerar Imagem (NanoBanana 2)"`
- Salvar `model: "nano2"` no registro do job

### 2. Frontend — `src/pages/GerarImagemTool.tsx`
- Tipo do state: `'normal' | 'pro' | 'nano2'`
- Default: `useState('nano2')` — pré-selecionado
- Novo custo: `creditCostNano2` (100 para normais, busca `gerar_imagem_nano2` para unlimited)
- Atualizar `currentCreditCost` e `modelLabel`
- Adicionar terceiro item no dropdown: `🍌 Nano Banana 2 — {creditCostNano2} cr`

### 3. Database — inserir configuração
- Inserir na tabela `ai_tool_settings`: `tool_name = 'gerar_imagem_nano2'`, `credit_cost = 100`

Nenhuma mudança na estrutura da API — o `gemini-3.1-flash-image-preview` usa o mesmo endpoint `generateContent` com `responseModalities: ["IMAGE", "TEXT"]` e `imageConfig` que os modelos atuais.

