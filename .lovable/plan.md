
# Corrigir Geração de Imagem + Redesenhar Botões de Proporção

## Diagnóstico dos Erros

### Erro Principal (503 — Alta Demanda)
Os logs mostram que **todas as 3 tentativas falharam com erro 503** do Google Gemini:
```
Gemini API error 503: "This model is currently experiencing high demand. 
Spikes in demand are usually temporary. Please try again later."
```
O modelo `gemini-3-pro-image-preview` está sobrecarregado. A edge function atualmente não faz nenhuma tentativa de retry nem fallback — qualquer falha da API resulta em erro imediato para o usuário (e estorno do crédito, que está correto).

### Problema Aspect Ratio (Não Funciona)
O `aspect_ratio` é enviado do front, salvo no banco, mas **nunca adicionado ao prompt** enviado ao Gemini. A API Gemini não tem campo específico para proporção — a informação precisa estar no texto do prompt.

### Problema UI — Botões de Proporção
O dropdown atual usa apenas texto `⬜ 1:1` sem nenhuma forma visual que mostre a proporção real da imagem.

---

## Solução em 3 Partes

### Parte 1 — Retry Automático + Fallback de Modelo (Edge Function)

Na edge function `generate-image/index.ts`, implementar:

1. **2 tentativas para o modelo Pro** com 3 segundos de espera entre elas
2. **Se ambas falharem com 503**, tentar automaticamente o modelo Normal (`gemini-2.5-flash-image`) como fallback
3. Cobrar o crédito do modelo que foi **efetivamente usado** (se cair no fallback, cobra o custo do Normal)
4. Mensagem clara ao usuário no caso de fallback: `"Modelo Pro indisponível, usando modelo padrão"`

### Parte 2 — Injetar Aspect Ratio no Prompt (Edge Function)

Adicionar mapeamento de proporção para texto descritivo em inglês que o Gemini entende:

```
"1:1"  → "square 1:1 aspect ratio"
"16:9" → "wide horizontal landscape 16:9 widescreen aspect ratio"
"9:16" → "tall vertical portrait 9:16 aspect ratio (like a phone screen)"
"4:3"  → "standard horizontal 4:3 aspect ratio"
"3:4"  → "vertical portrait 3:4 aspect ratio"
```

O prompt final ficará:
```
[prompt do usuário]. Generate this in [descrição do aspect ratio].
```

### Parte 3 — Redesenhar Seletor de Proporção (Front-end)

Substituir o dropdown de texto por **botões inline visuais** com ícones SVG que representam graficamente cada proporção. Cada botão terá:
- Um mini retângulo SVG com as proporções corretas
- Label com o nome da proporção abaixo
- Destaque em fuchsia/purple quando selecionado

Exemplos visuais dos ícones SVG:

```text
  1:1          16:9         9:16         4:3          3:4
┌────┐     ┌──────────┐   ┌──┐      ┌────────┐    ┌─────┐
│    │     │          │   │  │      │        │    │     │
│    │     └──────────┘   │  │      └────────┘    │     │
└────┘                    │  │                    └─────┘
                          └──┘
```

Os botões ficam na barra inferior, antes do botão "Gerar", numa linha compacta horizontal.

---

## Arquivos a Modificar

| Arquivo | O que muda |
|---|---|
| `supabase/functions/generate-image/index.ts` | Retry automático (2x Pro → fallback Normal) + injeção do aspect ratio no prompt |
| `src/pages/GerarImagemTool.tsx` | Substituir dropdown de proporção por botões visuais com SVG |

---

## Detalhes Técnicos

**Edge Function — Lógica de Retry:**
- Função auxiliar `callGeminiWithRetry(model, parts, maxRetries)` que tenta N vezes com delay de 3s entre cada
- Se o modelo Pro falhar após 2 tentativas com 503/429, chama o modelo Normal automaticamente
- Se ambos falharem, estorna crédito e retorna erro claro
- Se usar fallback, registra no job qual modelo foi efetivamente usado

**Front-end — Botões de Proporção:**
- Componente inline `AspectRatioSelector` dentro do mesmo arquivo
- SVG desenhado programaticamente com as dimensões proporcionais corretas
- Aparece como ícones pequenos (28×20px area) com label abaixo de 9px
- Selecionado: borda `fuchsia-500`, fundo `fuchsia-500/20`, texto `fuchsia-300`
- Não selecionado: borda `purple-500/25`, fundo `purple-900/40`, texto `purple-300`
